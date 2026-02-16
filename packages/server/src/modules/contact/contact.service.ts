import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import type { ContactFormPayload } from '@synth.textmode.art/contracts/contact';

export async function sendContactEmail(payload: ContactFormPayload): Promise<{ success: boolean; error?: string }> {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.CONTACT_EMAIL_RECIPIENT) {
        console.warn('[Contact] SMTP not configured! Skipping email sending.');
        return { success: true }; // Return success to not leak config issues to user
    }

    const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 465,
        secure: (env.SMTP_PORT || 465) === 465,
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: `"${payload.name}" <${env.SMTP_USER}>`,
            replyTo: payload.email,
            to: env.CONTACT_EMAIL_RECIPIENT,
            subject: `[Contact Form] ${payload.subject}`,
            text: `Name: ${payload.name}
Email: ${payload.email}

Message:
${payload.message}`,
            html: `
                <p><strong>Name:</strong> ${payload.name}</p>
                <p><strong>Email:</strong> ${payload.email}</p>
                <p><strong>Subject:</strong> ${payload.subject}</p>
                <hr />
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap;">${payload.message}</p>
            `,
        });

        return { success: true };
    } catch (error) {
        console.error('[Contact] Failed to send email:', error);
        return { success: false, error: 'Failed to send message' };
    }
}
