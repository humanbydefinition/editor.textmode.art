import type { FastifyPluginAsync } from 'fastify';
import {
  randomSketchQuerySchema,
  slugAvailabilityQuerySchema,
  type SlugAvailabilityResult,
} from '@synth.textmode.art/contracts/sketch';
import { normalizeSlug, validateSlug } from '../../shared/slug.js';
import { toApprovedSketch, toPublicSketchAccess } from './sketches.mapper.js';
import {
  findApprovedSketchBySlug,
  findActiveSketchBySlug,
  findRandomApprovedSketch,
  isSlugTaken,
} from './sketches.service.js';

const sketchesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/sketch-requests/slug-available', async (request, reply) => {
    const parsed = slugAvailabilityQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed' });
      return;
    }

    const normalizedSlug = normalizeSlug(parsed.data.slug);
    const slugValidation = validateSlug(normalizedSlug);
    if (!slugValidation.valid) {
      const response: SlugAvailabilityResult = { available: false, reason: slugValidation.reason, slug: normalizedSlug };
      reply.status(200).send(response);
      return;
    }

    const taken = await isSlugTaken(normalizedSlug);
    const response: SlugAvailabilityResult = { available: !taken, slug: normalizedSlug };
    reply.status(200).send(response);
  });

  app.get('/api/sketches/random', async (request, reply) => {
    const parsed = randomSketchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed' });
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

    const sketch = await findRandomApprovedSketch(excludeSlug);
    if (!sketch) {
      reply.status(404).send({ error: 'No approved sketches found' });
      return;
    }

    reply.send(toApprovedSketch(sketch));
  });

  app.get('/api/sketches/:slug', async (request, reply) => {
    const slugParam = (request.params as { slug: string }).slug ?? '';
    const sketch = await findApprovedSketchBySlug(slugParam);

    if (!sketch) {
      reply.status(404).send({ error: 'Sketch not found' });
      return;
    }

    reply.send(toApprovedSketch(sketch));
  });

  app.get('/api/sketches/:slug/access', async (request, reply) => {
    const slugParam = (request.params as { slug: string }).slug ?? '';
    const sketch = await findActiveSketchBySlug(slugParam);

    if (!sketch) {
      reply.status(404).send({ error: 'Sketch not found' });
      return;
    }

    reply.send(toPublicSketchAccess(sketch));
  });
};

export default sketchesRoutes;
