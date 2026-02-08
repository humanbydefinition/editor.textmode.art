import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { prisma } from '../db.js';
import { normalizeSlug, validateSlug } from '../utils/slug.js';
import { renderSlugPage, getBaseUrl } from '../templates/slug-page.js';
import { env } from '../config/env.js';

function getForwardedHeader(value: string | string[] | undefined): string | undefined {
    if (!value) return undefined;
    const first = Array.isArray(value) ? value[0] : value;
    const normalized = first.split(',')[0]?.trim();
    return normalized || undefined;
}

function getRequestOrigin(request: FastifyRequest): {
    protocol: string;
    host: string;
    forwarded: boolean;
} {
    const forwardedHost = getForwardedHeader(request.headers['x-forwarded-host']);
    const forwardedProto = getForwardedHeader(request.headers['x-forwarded-proto']);
    const protocol = forwardedProto ?? request.protocol;
    const host = forwardedHost ?? request.headers.host ?? request.hostname;
    return { protocol, host, forwarded: Boolean(forwardedHost) };
}

const slugRoutes: FastifyPluginAsync = async (app) => {
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

        const sketch = await prisma.sketchRequest.findFirst({
            where: {
                slug: normalizedSlug,
                status: { in: ['PENDING', 'APPROVED'] },
            },
        });

        if (!sketch) {
            await reply.redirect('/');
            return;
        }

        const requestOrigin = getRequestOrigin(request);
        const baseUrl = getBaseUrl(requestOrigin.host, requestOrigin.protocol);
        const renderMode = sketch.status === 'PENDING' ? 'pending' : 'approved';
        const devServerUrl = requestOrigin.forwarded
            ? `${requestOrigin.protocol}://${requestOrigin.host}`.replace(/\/$/, '')
            : (env.VITE_DEV_SERVER_URL || 'http://localhost:5173').replace(/\/$/, '');
        const html = renderSlugPage({
            sketch,
            baseUrl,
            renderMode,
            devServerUrl: env.NODE_ENV === 'production' ? undefined : devServerUrl,
        });

        reply.type('text/html').send(html);
    });
};

export default slugRoutes;
