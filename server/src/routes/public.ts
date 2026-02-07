import type { FastifyPluginAsync } from 'fastify';
import {
  createSketchRequestSchema,
  randomSketchQuerySchema,
  slugAvailabilityQuerySchema,
  type SketchRequestPayload,
  type SlugAvailabilityResult,
} from '@synth.textmode.art/contracts/sketch';
import { prisma } from '../db.js';
import { normalizeSlug, validateSlug } from '../utils/slug.js';
import { toApprovedSketch, toSketchRequestResult } from '../contracts/sketchMappers.js';

const publicRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/sketch-requests', async (request, reply) => {
    const parsed = createSketchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const payload: SketchRequestPayload = parsed.data;

    const normalizedSlug = normalizeSlug(payload.slug);
    const slugValidation = validateSlug(normalizedSlug);
    if (!slugValidation.valid) {
      reply.status(400).send({ error: slugValidation.reason, slug: normalizedSlug });
      return;
    }

    const existing = await prisma.sketchRequest.findUnique({ where: { slug: normalizedSlug } });
    if (existing) {
      reply.status(409).send({ error: 'Slug already in use', slug: normalizedSlug });
      return;
    }

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
      },
    });

    reply.status(201).send(toSketchRequestResult(created));
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

    const existing = await prisma.sketchRequest.findUnique({ where: { slug: normalizedSlug } });
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
};

export default publicRoutes;
