import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import { env } from '../config/env.js';

/**
 * CORS configuration.
 *
 * - Development: all origins allowed for local iteration.
 * - Production: only PUBLIC_BASE_URL and RUNNER_PUBLIC_URL are allowed.
 */
const corsPlugin: FastifyPluginAsync = async (app) => {
    if (env.NODE_ENV !== 'production') {
        app.register(cors, { origin: true });
        return;
    }

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
};

export default corsPlugin;
