import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FastifyPluginAsync } from 'fastify';
import staticPlugin from '@fastify/static';
import { env } from '../config/env.js';
import { getScreenshotStorageDir } from '../modules/screenshot/screenshot.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Static file serving and SPA fallback.
 *
 * - Always: serves screenshot storage under `/storage/`.
 * - Production: serves the built client from `dist/` and falls back to
 *   `index.html` for client-side routes (SPA pattern).
 */
const staticFilesPlugin: FastifyPluginAsync = async (app) => {
    // --- Screenshot storage ---
    const screenshotStorageDir = getScreenshotStorageDir();
    mkdirSync(screenshotStorageDir, { recursive: true });

    app.register(staticPlugin, {
        root: screenshotStorageDir,
        prefix: '/storage/',
        decorateReply: false,
    });

    // --- Production SPA serving ---
    if (env.NODE_ENV === 'production') {
        const distDir = env.STATIC_DIR
            ? path.resolve(env.STATIC_DIR)
            : path.resolve(__dirname, '../../../dist');

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
};

export default staticFilesPlugin;
