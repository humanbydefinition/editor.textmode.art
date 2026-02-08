import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { isPublicHost } from '../utils/net.js';

const mediaQuerySchema = z.object({
  url: z.string().url().max(2000),
});

const MAX_BYTES = 15 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8000;

function isAllowedContentType(contentType: string): boolean {
  const type = contentType.split(';')[0]?.trim().toLowerCase();
  return type.startsWith('image/') || type.startsWith('video/');
}

const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/media', async (request, reply) => {
    const parsed = mediaQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed' });
      return;
    }

    let target: URL;
    try {
      target = new URL(parsed.data.url);
    } catch {
      reply.status(400).send({ error: 'Invalid URL' });
      return;
    }

    if (target.protocol !== 'https:') {
      reply.status(400).send({ error: 'Only https URLs are allowed' });
      return;
    }

    const isPublic = await isPublicHost(target.hostname);
    if (!isPublic) {
      reply.status(403).send({ error: 'Blocked host' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(target.toString(), {
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        reply.status(502).send({ error: 'Upstream fetch failed' });
        return;
      }

      const finalUrl = new URL(response.url);
      if (finalUrl.protocol !== 'https:' || !(await isPublicHost(finalUrl.hostname))) {
        reply.status(403).send({ error: 'Blocked host' });
        return;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!isAllowedContentType(contentType)) {
        reply.status(415).send({ error: 'Unsupported content type' });
        return;
      }

      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const length = Number(contentLengthHeader);
        if (Number.isFinite(length) && length > MAX_BYTES) {
          reply.status(413).send({ error: 'Media too large' });
          return;
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_BYTES) {
        reply.status(413).send({ error: 'Media too large' });
        return;
      }

      reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=86400')
        .header('Access-Control-Allow-Origin', '*')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .send(Buffer.from(arrayBuffer));
    } catch (error) {
      clearTimeout(timeout);
      if ((error as Error).name === 'AbortError') {
        reply.status(504).send({ error: 'Upstream timeout' });
        return;
      }
      reply.status(502).send({ error: 'Upstream fetch failed' });
    }
  });
};

export default mediaRoutes;
