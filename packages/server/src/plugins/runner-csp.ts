import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';

/**
 * Runner iframe CSP override.
 *
 * In production, responses for `/runner/*` paths get a strict, isolated CSP
 * that sandboxes user-submitted sketch code running inside the runner iframe.
 */
const runnerCspPlugin: FastifyPluginAsync = async (app) => {
    if (env.NODE_ENV !== 'production') return;

    app.addHook('onSend', (request, reply, payload, done) => {
        const url = request.raw.url ?? '';
        if (url.startsWith('/runner/')) {
            const parentOrigins: string[] = [];
            if (env.PUBLIC_BASE_URL) {
                parentOrigins.push(env.PUBLIC_BASE_URL.replace(/\/$/, ''));
            }
            if (env.NODE_ENV !== 'production') {
                parentOrigins.push('http://localhost:5180');
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
};

export default runnerCspPlugin;
