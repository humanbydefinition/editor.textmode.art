import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { env } from './config/env.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import slugRoutes from './routes/slug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildServer(): FastifyInstance {
  const app = fastify({
    logger: true,
  });

  app.register(helmet, {
    contentSecurityPolicy: false,
  });

  app.register(cors, {
    origin: true,
  });

  app.register(publicRoutes);
  app.register(adminRoutes);
  app.register(slugRoutes);

  app.get('/api/health', async () => ({ status: 'ok' }));

  if (env.NODE_ENV === 'production') {
    const distDir = env.STATIC_DIR
      ? path.resolve(env.STATIC_DIR)
      : path.resolve(__dirname, '../../dist');

    app.register(staticPlugin, {
      root: distDir,
      prefix: '/',
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith('/api/')) {
        reply.status(404).send({ error: 'Not found' });
        return;
      }
      reply.sendFile('index.html');
    });
  }

  return app;
}
