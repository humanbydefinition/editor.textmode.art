import fastify, { type FastifyInstance } from 'fastify';
import databasePlugin from './plugins/database.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import securityHeadersPlugin from './plugins/security-headers.js';
import corsPlugin from './plugins/cors.js';
import staticFilesPlugin from './plugins/static-files.js';
import runnerCspPlugin from './plugins/runner-csp.js';
import discordPlugin from './plugins/discord.js';

import sketchesRoutes from './modules/sketches/sketches.routes.js';
import submissionsRoutes from './modules/submissions/submissions.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import slugPageRoutes from './modules/slug-page/slug-page.routes.js';
import mediaRoutes from './modules/media/media.routes.js';
import screenshotRoutes from './modules/screenshot/screenshot.routes.js';
import contactRoutes from './modules/contact/contact.routes.js';

export function buildServer(): FastifyInstance {
  const app = fastify({
    logger: true,
  });

  // --- Cross-cutting concerns (order matters) ---
  app.register(databasePlugin);
  app.register(errorHandlerPlugin);
  app.register(securityHeadersPlugin);
  app.register(corsPlugin);
  app.register(discordPlugin);

  // --- Domain routes ---
  app.register(sketchesRoutes);
  app.register(submissionsRoutes);
  app.register(adminRoutes);
  app.register(slugPageRoutes);
  app.register(mediaRoutes);
  app.register(screenshotRoutes);
  app.register(contactRoutes);

  // --- Static files, storage, and SPA fallback ---
  app.register(staticFilesPlugin);
  app.register(runnerCspPlugin);

  // --- Health check ---
  app.get('/api/health', async () => ({ status: 'ok' }));

  return app;
}
