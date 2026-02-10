import type { FastifyInstance } from 'fastify';
import { prisma } from '../../database/client.js';
import { PREVIEW_TEMPLATE } from './preview.template.js';

export default async function previewRoutes(app: FastifyInstance) {
  app.get('/preview/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const sketch = await prisma.sketchRequest.findFirst({
      where: { slug },
    });

    if (!sketch) {
      return reply.status(404).send('Sketch not found');
    }

    // Safe injection of code
    const safeCode = sketch.textmodeCode.replace(/<\/script>/gi, '<\/script>');
    
    const html = PREVIEW_TEMPLATE.replace('/* SKETCH_CODE_INJECTION */', safeCode);

    // Set CSP headers for this route to allow esm.sh
    reply.header(
      'Content-Security-Policy', 
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh; style-src 'self' 'unsafe-inline'; connect-src 'self' https://esm.sh data:; font-src 'self' data:;"
    );

    return reply.type('text/html').send(html);
  });
}
