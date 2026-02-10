import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../database/client.js';

/**
 * Database lifecycle plugin.
 *
 * Registers a Fastify `onClose` hook to disconnect the Prisma client
 * during graceful shutdown, ensuring the framework controls shutdown
 * ordering rather than raw `process.on` handlers.
 */
const databasePlugin: FastifyPluginAsync = async (app) => {
    app.addHook('onClose', async () => {
        await prisma.$disconnect();
        app.log.info('Prisma client disconnected');
    });
};

export default databasePlugin;
