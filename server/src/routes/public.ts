import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { normalizeSlug, validateSlug } from '../utils/slug';

const socialLinkSchema = z.object({
  label: z.string().min(1).max(32),
  url: z.string().url().max(200),
});

const createSketchRequestSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(300).optional().nullable(),
  authorName: z.string().max(80).optional().nullable(),
  license: z.string().max(120).optional().nullable(),
  socialLinks: z.array(socialLinkSchema).max(6).optional().nullable(),
  textmodeCode: z.string().min(1).max(300_000),
  strudelCode: z.string().max(300_000).optional().nullable(),
});

const slugAvailabilitySchema = z.object({
  slug: z.string().min(1),
});

const randomSketchQuerySchema = z.object({
  excludeSlug: z.string().min(1).optional(),
});

const publicRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/sketch-requests', async (request, reply) => {
    const parsed = createSketchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const normalizedSlug = normalizeSlug(parsed.data.slug);
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
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        authorName: parsed.data.authorName ?? null,
        license: parsed.data.license ?? null,
        socialLinks: parsed.data.socialLinks ?? null,
        textmodeCode: parsed.data.textmodeCode,
        strudelCode: parsed.data.strudelCode ?? null,
      },
    });

    reply.status(201).send({
      id: created.id,
      slug: created.slug,
      status: created.status,
      createdAt: created.createdAt,
    });
  });

  app.get('/api/sketch-requests/slug-available', async (request, reply) => {
    const parsed = slugAvailabilitySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const normalizedSlug = normalizeSlug(parsed.data.slug);
    const slugValidation = validateSlug(normalizedSlug);
    if (!slugValidation.valid) {
      reply.status(200).send({ available: false, reason: slugValidation.reason, slug: normalizedSlug });
      return;
    }

    const existing = await prisma.sketchRequest.findUnique({ where: { slug: normalizedSlug } });
    reply.status(200).send({ available: !existing, slug: normalizedSlug });
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

    reply.send({
      id: sketch.id,
      slug: sketch.slug,
      title: sketch.title,
      description: sketch.description,
      authorName: sketch.authorName,
      license: sketch.license,
      socialLinks: sketch.socialLinks,
      textmodeCode: sketch.textmodeCode,
      strudelCode: sketch.strudelCode,
      ogImageUrl: sketch.ogImageUrl,
      createdAt: sketch.createdAt,
    });
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

    reply.send({
      id: sketch.id,
      slug: sketch.slug,
      title: sketch.title,
      description: sketch.description,
      authorName: sketch.authorName,
      license: sketch.license,
      socialLinks: sketch.socialLinks,
      textmodeCode: sketch.textmodeCode,
      strudelCode: sketch.strudelCode,
      ogImageUrl: sketch.ogImageUrl,
      createdAt: sketch.createdAt,
    });
  });
};

export default publicRoutes;
