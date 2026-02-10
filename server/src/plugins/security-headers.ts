import type { FastifyPluginAsync } from 'fastify';
import helmet from '@fastify/helmet';
import { env } from '../config/env.js';

/**
 * Helmet + Content-Security-Policy configuration.
 *
 * In production a strict CSP is applied; in development CSP is disabled
 * so that Vite HMR and dev tools work without friction.
 */
const securityHeadersPlugin: FastifyPluginAsync = async (app) => {
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
};

export default securityHeadersPlugin;
