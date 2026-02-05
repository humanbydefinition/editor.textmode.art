import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db.js';
import { normalizeSlug, validateSlug } from '../utils/slug.js';
import { renderSlugPage, getBaseUrl } from '../templates/slug-page.js';

const slugRoutes: FastifyPluginAsync = async (app) => {
    /**
     * GET /s/:slug
     * Server-rendered HTML page for approved sketches with SEO meta tags.
     */
    app.get('/s/:slug', async (request, reply) => {
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

        const baseUrl = getBaseUrl(request.hostname);
        const html = renderSlugPage({ sketch, baseUrl });

        reply.type('text/html').send(html);
    });
};

export default slugRoutes;
