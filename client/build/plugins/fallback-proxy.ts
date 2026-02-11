import type { Plugin } from 'vite';

export interface FallbackProxyOptions {
    target: string;
}

export function fallbackProxy(options: FallbackProxyOptions): Plugin {
    return {
        name: 'fallback-proxy',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url?.startsWith('/s/')) {
                    try {
                        const upstream = await fetch(options.target + req.url);
                        if (upstream.ok) {
                            const contentType = upstream.headers.get('content-type');
                            if (contentType) {
                                res.setHeader('Content-Type', contentType);
                            }
                            const text = await upstream.text();
                            res.end(text);
                            return;
                        }
                    } catch (e) {
                        // Backend down or unreachable, fall through to next() which lets Vite serve index.html
                    }
                }
                next();
            });
        },
    };
}
