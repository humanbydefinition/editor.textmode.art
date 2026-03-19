import type { FastifyPluginAsync } from 'fastify';
import {
  createSketchRequestSchema,
  sketchSubmissionQueueStatusSchema,
  type SketchRequestPayload,
  type SketchSubmissionQueueStatus,
} from '@synth.textmode.art/contracts/sketch';
import { env } from '../../config/env.js';
import { NoPiiAntiSpamGuard } from '../../security/anti-spam.guard.js';
import { verifyTurnstileToken } from '../../security/turnstile.guard.js';
import { toSketchRequestResult } from '../sketches/sketches.mapper.js';
import {
  getPendingCount,
  createSketchRequest,
} from './submissions.service.js';

import { isSlugTaken, normalizeAndValidateSlug } from '../../shared/slug.js';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const antiSpamGuard = new NoPiiAntiSpamGuard({
  secret: env.ANTI_SPAM_SECRET ?? '',
  difficulty: env.ANTI_SPAM_POW_DIFFICULTY,
  challengeTtlMs: env.ANTI_SPAM_CHALLENGE_TTL_SECONDS * 1000,
  maxChallengesPerMinute: env.ANTI_SPAM_MAX_CHALLENGES_PER_MINUTE,
  maxSubmissionsPerMinute: env.ANTI_SPAM_MAX_SUBMISSIONS_PER_MINUTE,
  idempotencyTtlMs: env.ANTI_SPAM_IDEMPOTENCY_TTL_SECONDS * 1000,
});

function getIdempotencyKey(headerValue: string | string[] | undefined): string | null {
  if (!headerValue) return null;
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const normalized = raw.trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

const submissionsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/sketch-requests/challenge', async (_request, reply) => {
    const challengeOrError = antiSpamGuard.issueChallenge();
    if ('error' in challengeOrError) {
      reply.status(challengeOrError.statusCode).send({ error: challengeOrError.error });
      return;
    }

    reply.status(200).send(challengeOrError);
  });

  app.get('/api/sketch-requests/queue-status', async (_request, reply) => {
    const pending = await getPendingCount();

    const response: SketchSubmissionQueueStatus = {
      full: pending >= env.ANTI_SPAM_MAX_PENDING_REQUESTS,
      publishConsentPolicyVersion: env.PUBLISH_CONSENT_POLICY_VERSION,
    };

    reply.status(200).send(sketchSubmissionQueueStatusSchema.parse(response));
  });

  app.post('/api/sketch-requests', async (request, reply) => {
    const idempotencyKey = getIdempotencyKey(request.headers['x-idempotency-key']);
    if (!idempotencyKey) {
      reply.status(400).send({ error: 'A valid x-idempotency-key header is required.' });
      return;
    }

    const parsed = createSketchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed' });
      return;
    }

    const payload: SketchRequestPayload = parsed.data;
    if (payload.publishConsent.policyVersion !== env.PUBLISH_CONSENT_POLICY_VERSION) {
      reply.status(400).send({
        error: 'Consent policy version mismatch. Please refresh and review the consent text again.',
      });
      return;
    }

    const turnstileResult = await verifyTurnstileToken({
      secretKey: env.TURNSTILE_SECRET_KEY ?? '',
      token: payload.turnstileToken,
      verifyUrl: env.TURNSTILE_VERIFY_URL,
      remoteIp: request.ip,
    });
    if (!('ok' in turnstileResult)) {
      reply.status(turnstileResult.statusCode).send({ error: turnstileResult.error });
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

    const pendingCount = await getPendingCount();
    if (pendingCount >= env.ANTI_SPAM_MAX_PENDING_REQUESTS) {
      reply.status(503).send({ error: 'Submission queue is currently full. Please try again later.' });
      return;
    }

    const slugResult = normalizeAndValidateSlug(payload.slug);
    if (!slugResult.valid) {
      reply.status(400).send({ error: slugResult.reason });
      return;
    }

    const taken = await isSlugTaken(slugResult.slug);
    if (taken) {
      reply.status(409).send({ error: 'Slug already in use' });
      return;
    }

    const result = await createSketchRequest(payload, slugResult.slug);
    if (!result.ok) {
      reply.status(409).send({ error: 'Slug already in use' });
      return;
    }

    reply.status(201).send(toSketchRequestResult(result.data));
  });
};

export default submissionsRoutes;
