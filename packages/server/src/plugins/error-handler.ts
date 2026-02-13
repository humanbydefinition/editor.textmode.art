import type { FastifyPluginAsync } from 'fastify';

/**
 * Centralised error handler.
 *
 * - 4xx errors return a safe, generic public message.
 * - 5xx errors return "Internal server error" to prevent information leakage.
 * - Every error is logged via the request-scoped Fastify logger.
 */
const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
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
};

export default errorHandlerPlugin;
