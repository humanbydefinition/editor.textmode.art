import type { FastifyPluginAsync } from 'fastify';
import { contactFormSchema } from '@synth.textmode.art/contracts/contact';
import { verifyTurnstileToken } from '../../security/turnstile.guard.js';
import { env } from '../../config/env.js';
import { sendContactEmail } from './contact.service.js';

const contactRoutes: FastifyPluginAsync = async (app) => {
    app.post('/api/contact', async (request, reply) => {
        const parsed = contactFormSchema.safeParse(request.body);
        if (!parsed.success) {
            reply.status(400).send({ error: 'Validation failed', details: parsed.error.format() });
            return;
        }

        const payload = parsed.data;

        // Verify Turnstile
        const turnstileResult = await verifyTurnstileToken({
            secretKey: env.TURNSTILE_SECRET_KEY ?? '',
            token: payload.turnstileToken,
            verifyUrl: env.TURNSTILE_VERIFY_URL,
            remoteIp: request.ip,
        });

        if (!('ok' in turnstileResult)) {
            reply.status(turnstileResult.statusCode).send({ error: turnstileResult.error });
            return;
        }

        const result = await sendContactEmail(payload);
        if (!result.success) {
            reply.status(500).send({ error: result.error });
            return;
        }

        reply.status(200).send({ success: true, message: 'Message sent successfully' });
    });
};

export default contactRoutes;
