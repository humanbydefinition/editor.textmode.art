import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import {
  createSketchRequestSchema,
  randomSketchQuerySchema,
  slugAvailabilityQuerySchema,
  type SketchRequestPayload,
  type SketchStatus,
  type SlugAvailabilityResult,
} from '@synth.textmode.art/contracts/sketch';
import { prisma } from '../db.js';
import { normalizeSlug, validateSlug } from '../utils/slug.js';
import { toApprovedSketch, toPublicSketchAccess, toSketchRequestResult } from '../contracts/sketchMappers.js';
import { env } from '../config/env.js';
import { NoPiiAntiSpamGuard } from '../security/noPiiAntiSpam.js';

const ACTIVE_SKETCH_STATUSES: SketchStatus[] = ['PENDING', 'APPROVED'];
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const antiSpamGuard = new NoPiiAntiSpamGuard({
  secret: env.ANTI_SPAM_SECRET ?? '',
  difficulty: env.ANTI_SPAM_POW_DIFFICULTY,
  challengeTtlMs: env.ANTI_SPAM_CHALLENGE_TTL_SECONDS * 1000,
  maxChallengesPerMinute: env.ANTI_SPAM_MAX_CHALLENGES_PER_MINUTE,
  maxSubmissionsPerMinute: env.ANTI_SPAM_MAX_SUBMISSIONS_PER_MINUTE,
  idempotencyTtlMs: env.ANTI_SPAM_IDEMPOTENCY_TTL_SECONDS * 1000,
});

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function getIdempotencyKey(headerValue: string | string[] | undefined): string | null {
  if (!headerValue) return null;
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const normalized = raw.trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/sketch-requests/challenge', async (_request, reply) => {
    const challengeOrError = antiSpamGuard.issueChallenge();
    if ('error' in challengeOrError) {
      reply.status(challengeOrError.statusCode).send({ error: challengeOrError.error });
      return;
    }

    reply.status(200).send(challengeOrError);
  });

  app.post('/api/sketch-requests', async (request, reply) => {
    const idempotencyKey = getIdempotencyKey(request.headers['x-idempotency-key']);
    if (!idempotencyKey) {
      reply.status(400).send({ error: 'A valid x-idempotency-key header is required.' });
      return;
    }

    const parsed = createSketchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const payload: SketchRequestPayload = parsed.data;
    if (payload.publishConsent.policyVersion !== env.PUBLISH_CONSENT_POLICY_VERSION) {
      reply.status(400).send({
        error: 'Consent policy version mismatch. Please refresh and review the consent text again.',
      });
      return;
    }

    const proofResult = antiSpamGuard.verifyAndConsumeSubmissionProof(payload);
    if (!('ok' in proofResult)) {
      reply.status(proofResult.statusCode).send({ error: proofResult.error });
      return;
    }

    const idempotencyResult = antiSpamGuard.consumeIdempotencyKey(idempotencyKey);
    if (!('ok' in idempotencyResult)) {
      reply.status(idempotencyResult.statusCode).send({ error: idempotencyResult.error });
      return;
    }

    const pendingCount = await prisma.sketchRequest.count({
      where: { status: 'PENDING' },
    });
    if (pendingCount >= env.ANTI_SPAM_MAX_PENDING_REQUESTS) {
      reply.status(503).send({ error: 'Submission queue is currently full. Please try again later.' });
      return;
    }

    const normalizedSlug = normalizeSlug(payload.slug);
    const slugValidation = validateSlug(normalizedSlug);
    if (!slugValidation.valid) {
      reply.status(400).send({ error: slugValidation.reason, slug: normalizedSlug });
      return;
    }

    const existing = await prisma.sketchRequest.findFirst({
      where: {
        slug: normalizedSlug,
        status: { in: ACTIVE_SKETCH_STATUSES },
      },
    });
    if (existing) {
      reply.status(409).send({ error: 'Slug already in use', slug: normalizedSlug });
      return;
    }

    try {
      const created = await prisma.sketchRequest.create({
        data: {
          slug: normalizedSlug,
          title: payload.title,
          description: payload.description ?? null,
          authorName: payload.authorName ?? null,
          license: payload.license ?? null,
          socialLinks: payload.socialLinks ?? undefined,
          textmodeCode: payload.textmodeCode,
          strudelCode: payload.strudelCode ?? null,
          publishConsentAccepted: payload.publishConsent.accepted,
          publishConsentAcceptedAt: new Date(),
          publishConsentPolicyVersion: payload.publishConsent.policyVersion,
        },
      });

      reply.status(201).send(toSketchRequestResult(created));
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        reply.status(409).send({ error: 'Slug already in use', slug: normalizedSlug });
        return;
      }
      throw error;
    }
  });

  app.get('/api/sketch-requests/slug-available', async (request, reply) => {
    const parsed = slugAvailabilityQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const normalizedSlug = normalizeSlug(parsed.data.slug);
    const slugValidation = validateSlug(normalizedSlug);
    if (!slugValidation.valid) {
      const response: SlugAvailabilityResult = { available: false, reason: slugValidation.reason, slug: normalizedSlug };
      reply.status(200).send(response);
      return;
    }

    const existing = await prisma.sketchRequest.findFirst({
      where: {
        slug: normalizedSlug,
        status: { in: ACTIVE_SKETCH_STATUSES },
      },
    });
    const response: SlugAvailabilityResult = { available: !existing, slug: normalizedSlug };
    reply.status(200).send(response);
  });

  app.get('/api/sketches/random', async (request, reply) => {
    const parsed = randomSketchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    let excludeSlug: string | undefined;
    if (parsed.data.excludeSlug) {
      const normalizedExclude = normalizeSlug(parsed.data.excludeSlug);
      const excludeValidation = validateSlug(normalizedExclude);
      if (!excludeValidation.valid) {
        reply.status(400).send({ error: 'Invalid excludeSlug' });
        return;
      }
      excludeSlug = normalizedExclude;
    }

    const whereClause = {
      status: 'APPROVED' as const,
      ...(excludeSlug ? { slug: { not: excludeSlug } } : {}),
    };

    const total = await prisma.sketchRequest.count({
      where: whereClause,
    });

    if (total === 0) {
      reply.status(404).send({ error: 'No approved sketches found' });
      return;
    }

    const randomIndex = Math.floor(Math.random() * total);
    const sketch = await prisma.sketchRequest.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      skip: randomIndex,
    });

    if (!sketch) {
      reply.status(404).send({ error: 'Sketch not found' });
      return;
    }

    reply.send(toApprovedSketch(sketch));
  });

  app.get('/api/sketches/:slug', async (request, reply) => {
    const slugParam = (request.params as { slug: string }).slug ?? '';
    const normalizedSlug = normalizeSlug(slugParam);
    const slugValidation = validateSlug(normalizedSlug);
    if (!slugValidation.valid) {
      reply.status(404).send({ error: 'Sketch not found' });
      return;
    }

    const sketch = await prisma.sketchRequest.findFirst({
      where: {
        slug: normalizedSlug,
        status: 'APPROVED',
      },
    });

    if (!sketch) {
      reply.status(404).send({ error: 'Sketch not found' });
      return;
    }

    reply.send(toApprovedSketch(sketch));
  });

  app.get('/api/sketches/:slug/access', async (request, reply) => {
    const slugParam = (request.params as { slug: string }).slug ?? '';
    const normalizedSlug = normalizeSlug(slugParam);
    const slugValidation = validateSlug(normalizedSlug);
    if (!slugValidation.valid) {
      reply.status(404).send({ error: 'Sketch not found' });
      return;
    }

    const sketch = await prisma.sketchRequest.findFirst({
      where: {
        slug: normalizedSlug,
        status: { in: ACTIVE_SKETCH_STATUSES },
      },
    });

    if (!sketch) {
      reply.status(404).send({ error: 'Sketch not found' });
      return;
    }

    reply.send(toPublicSketchAccess(sketch));
  });
};

export default publicRoutes;
