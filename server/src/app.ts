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
import mediaRoutes from './routes/media.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildServer(): FastifyInstance {
  const app = fastify({
    logger: true,
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Unhandled request error');

    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? ((error as { statusCode: number }).statusCode)
      : 500;

    if (statusCode >= 400 && statusCode < 500) {
      const publicMessageByStatus: Record<number, string> = {
        400: 'Bad request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not found',
        405: 'Method not allowed',
        408: 'Request timeout',
        409: 'Conflict',
        413: 'Payload too large',
        415: 'Unsupported media type',
        422: 'Unprocessable entity',
        429: 'Too many requests',
      };

      reply.status(statusCode).send({ error: publicMessageByStatus[statusCode] ?? 'Request failed' });
      return;
    }

    reply.status(500).send({ error: 'Internal server error' });
  });

  const runnerOrigin = env.RUNNER_PUBLIC_URL
    ? env.RUNNER_PUBLIC_URL.replace(/\/$/, '')
    : undefined;

  app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production'
      ? {
          directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'none'"],
            frameAncestors: ["'self'"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://analytics.textmode.art', 'https://challenges.cloudflare.com'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            mediaSrc: ["'self'", 'blob:', 'https:'],
            connectSrc: ["'self'", 'https:', 'https://analytics.textmode.art', 'https://challenges.cloudflare.com'],
            frameSrc: ["'self'", runnerOrigin ?? "'self'", 'https://challenges.cloudflare.com'],
          },
        }
      : false,
  });

  if (env.NODE_ENV !== 'production') {
    app.register(cors, { origin: true });
  } else {
    const allowedOrigins = new Set<string>();
    if (env.PUBLIC_BASE_URL) {
      allowedOrigins.add(env.PUBLIC_BASE_URL.replace(/\/$/, ''));
    }
    if (env.RUNNER_PUBLIC_URL) {
      allowedOrigins.add(env.RUNNER_PUBLIC_URL.replace(/\/$/, ''));
    }
    app.register(cors, {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed'), false);
      },
    });
  }

  app.register(publicRoutes);
  app.register(adminRoutes);
  app.register(slugRoutes);
  app.register(mediaRoutes);

  app.get('/api/health', async () => ({ status: 'ok' }));

  if (env.NODE_ENV === 'production') {
    const distDir = env.STATIC_DIR
      ? path.resolve(env.STATIC_DIR)
      : path.resolve(__dirname, '../../dist');

    app.register(staticPlugin, {
      root: distDir,
      prefix: '/',
    });

    app.addHook('onSend', (request, reply, payload, done) => {
      const url = request.raw.url ?? '';
      if (url.startsWith('/runner/')) {
        const parentOrigins: string[] = [];
        if (env.PUBLIC_BASE_URL) {
          parentOrigins.push(env.PUBLIC_BASE_URL.replace(/\/$/, ''));
        }
        if (env.NODE_ENV !== 'production') {
          parentOrigins.push('http://localhost:5173');
        }
        const frameAncestors = parentOrigins.length > 0 ? parentOrigins.join(' ') : "'none'";
        const runnerCsp = [
          "default-src 'none'",
          "base-uri 'none'",
          `frame-ancestors ${frameAncestors}`,
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src https: data: blob:",
          "media-src https: blob:",
          "connect-src https:",
          "font-src 'self'",
        ].join('; ');

        reply
          .header('Content-Security-Policy', runnerCsp)
          .header('Access-Control-Allow-Origin', '*')
          .header('Cross-Origin-Resource-Policy', 'cross-origin')
          .header('Referrer-Policy', 'no-referrer')
          .header(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), usb=(), payment=(), serial=(), midi=()'
          );
      }
      done(null, payload);
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
