import { timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../database/client.js';
import { normalizeSlug, validateSlug } from '../../shared/slug.js';
import { PREVIEW_TEMPLATE } from './screenshot.template.js';
import { getScreenshotPreviewToken, SCREENSHOT_PREVIEW_ROUTE } from './screenshot.config.js';

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function tokenMatches(requestToken: string | undefined, expectedToken: string): boolean {
  if (!requestToken) return false;
  const requestBuffer = Buffer.from(requestToken, 'utf8');
  const expectedBuffer = Buffer.from(expectedToken, 'utf8');
  if (requestBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(requestBuffer, expectedBuffer);
}

const previewRoutes: FastifyPluginAsync = async (app) => {
  const previewToken = getScreenshotPreviewToken();

  app.get(SCREENSHOT_PREVIEW_ROUTE, async (request, reply) => {
    if (!previewToken) {
      reply.status(503).send('Preview rendering is not configured');
      return;
    }

    const requestToken = getHeaderValue(request.headers['x-screenshot-preview-token']);
    if (!tokenMatches(requestToken, previewToken)) {
      reply.status(404).send('Not found');
      return;
    }

    const rawSlug = (request.params as { slug: string }).slug ?? '';
    const slug = normalizeSlug(rawSlug);
    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      reply.status(404).send('Sketch not found');
      return;
    }

    const sketch = await prisma.sketchRequest.findFirst({
      where: {
        slug,
        status: 'APPROVED',
      },
      select: { textmodeCode: true },
    });

    if (!sketch) {
      reply.status(404).send('Sketch not found');
      return;
    }

    const safeCode = sketch.textmodeCode.replace(/<\/script>/gi, '<\\/script>');
    const html = PREVIEW_TEMPLATE.replace('/* SKETCH_CODE_INJECTION */', safeCode);

    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://esm.sh; style-src 'unsafe-inline'; connect-src https://esm.sh data:; img-src data: blob:; font-src data:; base-uri 'none'; frame-ancestors 'none'"
    );
    reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    reply.type('text/html').send(html);
  });
};

export default previewRoutes;
