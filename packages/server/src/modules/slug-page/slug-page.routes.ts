import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../database/client.js';
import { slugPageSelect } from '../../database/selects.js';
import { normalizeSlug, validateSlug } from '../../shared/slug.js';
import { renderSlugPage, getBaseUrl } from './slug-page.template.js';
import { env } from '../../config/env.js';

const slugPageRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /s/:slug
   * Server-rendered HTML page for pending and approved sketches.
   */
  app.get('/s/:slug', async (request, reply) => {
    const slugParam = (request.params as { slug: string }).slug ?? '';
    const normalizedSlug = normalizeSlug(slugParam);
    const slugValidation = validateSlug(normalizedSlug);

    if (!slugValidation.valid) {
      await reply.redirect('/');
      return;
    }

    let sketch;
    try {
      sketch = await prisma.sketchRequest.findFirst({
        where: {
          slug: normalizedSlug,
          status: { in: ['PENDING', 'APPROVED'] },
        },
        select: slugPageSelect,
      });
    } catch (error) {
      request.log.error({ err: error }, 'Database unavailable for slug page, serving SPA fallback');
      await reply.redirect('/');
      return;
    }

    if (!sketch) {
      await reply.redirect('/');
      return;
    }

    const baseUrl = getBaseUrl(request.hostname, request.protocol);
    const renderMode = sketch.status === 'PENDING' ? 'pending' : 'approved';
    const devServerUrl = (env.VITE_DEV_SERVER_URL || 'http://localhost:5180').replace(/\/$/, '');
    const html = renderSlugPage({
      sketch,
      baseUrl,
      renderMode,
      devServerUrl: env.NODE_ENV === 'production' ? undefined : devServerUrl,
      logger: request.log,
    });

    reply.type('text/html').send(html);
  });
};

export default slugPageRoutes;
