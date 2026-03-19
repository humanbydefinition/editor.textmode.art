import type { Textmodifier } from 'textmode.js';
import type { TextmodeLayerManager, TextmodeLayer } from 'textmode.js/layering';

export interface SafeProxyOptions {
    /** Called when an error occurs in a draw callback */
    onDrawError: (error: Error) => void;
    /** Whether draw errors have occurred (to skip further draw calls) */
    hasDrawError: () => boolean;
    /** Optional media proxy URL for CORS fallback */
    mediaProxyUrl?: string;
}

/**
 * Creates proxies for textmode objects that safely wrap draw callbacks.
 * Ensures runtime errors in user draw loops don't crash the entire application.
 */
export class SafeProxyFactory {
    private options: SafeProxyOptions;
    private readonly assetLoadCache = new Map<string, Promise<unknown>>();
    private static readonly MAX_ASSET_CACHE_ENTRIES = 64;

    constructor(options: SafeProxyOptions) {
        this.options = options;
    }

    /**
     * Create a proxy for the main textmode instance
     */
    createTextmodeProxy(original: Textmodifier): Textmodifier {
        return new Proxy(original, {
            get: (target, prop) => {
                const value = (target as unknown as Record<string | symbol, unknown>)[prop];

                if (prop === 'draw') {
                    return (callback: () => void) => target.draw(this.wrapDrawCallback(callback));
                }

                if (prop === 'loadImage') {
                    return (src: string) => this.wrapMediaLoad(target, value, src, 'image');
                }

                if (prop === 'loadVideo') {
                    return (src: string) => this.wrapMediaLoad(target, value, src, 'video');
                }

                if (prop === 'loadFont') {
                    return (fontSource: string | unknown, setActive?: boolean) =>
                        this.wrapTextmodeFontLoad(target, value, fontSource, setActive);
                }

                if (prop === 'layers') {
                    return this.createLayerManagerProxy(target.layers);
                }

                return value;
            },
        });
    }

    /**
     * Create a proxy for the layer manager
     */
    private createLayerManagerProxy(layers: TextmodeLayerManager): TextmodeLayerManager {
        return new Proxy(layers, {
            get: (target, prop) => {
                const value = (target as unknown as Record<string | symbol, unknown>)[prop];

                if (prop === 'base') {
                    return this.createLayerProxy(target.base);
                }

                if (prop === 'add') {
                    return (options?: Parameters<typeof target.add>[0]) => {
                        const layer = target.add(options);
                        return this.createLayerProxy(layer);
                    };
                }

                if (prop === 'all') {
                    return (target.all as TextmodeLayer[]).map((layer) => this.createLayerProxy(layer));
                }

                return value;
            },
        });
    }

    /**
     * Create a proxy for a single layer
     */
    private createLayerProxy(layer: TextmodeLayer): TextmodeLayer {
        return new Proxy(layer, {
            get: (target, prop) => {
                const value = (target as unknown as Record<string | symbol, unknown>)[prop];

                if (prop === 'draw') {
                    return (callback: () => void) => target.draw(this.wrapDrawCallback(callback));
                }

                if (prop === 'loadFont') {
                    return (fontSource: string | unknown) => this.wrapLayerFontLoad(target, value, fontSource);
                }

                if (typeof value === 'function') {
                    return value.bind(target);
                }

                return value;
            },
        });
    }

    /**
     * Wrap a draw callback to catch errors without crashing
     */
    private wrapDrawCallback(callback: () => void): () => void {
        return () => {
            if (this.options.hasDrawError()) return; // Skip if in error state
            try {
                callback();
            } catch (error) {
                this.options.onDrawError(error as Error);
            }
        };
    }

    private wrapMediaLoad(
        target: Textmodifier,
        value: unknown,
        src: string,
        type: 'image' | 'video'
    ): Promise<unknown> {
        if (typeof value !== 'function') {
            return Promise.reject(new Error('loadImage/loadVideo is not a function'));
        }

        const originalUrl = src;
        const fallbackUrl = this.getProxyUrl(src);
        const invoke = (url: string) => (value as (arg: string) => Promise<unknown>).call(target, url);
        const loadUrl = fallbackUrl && fallbackUrl !== originalUrl ? fallbackUrl : originalUrl;
        const cacheKey = `${type}:${loadUrl}`;
        return this.getOrSetCachedLoad(cacheKey, () => invoke(loadUrl));
    }

    private wrapTextmodeFontLoad(
        target: Textmodifier,
        value: unknown,
        fontSource: string | unknown,
        setActive?: boolean
    ): Promise<unknown> {
        if (typeof value !== 'function') {
            return Promise.reject(new Error('loadFont is not a function'));
        }

        const invoke = (source: unknown, active?: boolean) =>
            (value as (source: unknown, setActive?: boolean) => Promise<unknown>).call(target, source, active);

        if (typeof fontSource !== 'string') {
            return invoke(fontSource, setActive);
        }

        const fallbackUrl = this.getProxyUrl(fontSource);
        const loadUrl = fallbackUrl && fallbackUrl !== fontSource ? fallbackUrl : fontSource;
        const cacheKey = `font:${loadUrl}`;
        const activeRequested = setActive !== false;
        const cachedFontPromise = this.getOrSetCachedLoad(cacheKey, () => invoke(loadUrl, false));

        if (!activeRequested) {
            return cachedFontPromise;
        }

        return cachedFontPromise.then((font) => invoke(font, true));
    }

    private wrapLayerFontLoad(layer: TextmodeLayer, value: unknown, fontSource: string | unknown): Promise<unknown> {
        if (typeof value !== 'function') {
            return Promise.reject(new Error('loadFont is not a function'));
        }

        const invoke = (source: unknown) => (value as (arg: unknown) => Promise<unknown>).call(layer, source);

        if (typeof fontSource !== 'string') {
            return invoke(fontSource);
        }

        const fallbackUrl = this.getProxyUrl(fontSource);
        const loadUrl = fallbackUrl && fallbackUrl !== fontSource ? fallbackUrl : fontSource;
        const cacheKey = `layer-font:${loadUrl}`;
        const cachedFontPromise = this.getOrSetCachedLoad(cacheKey, () => invoke(loadUrl));

        return cachedFontPromise.then((font) => invoke(font));
    }

    private getOrSetCachedLoad(cacheKey: string, loader: () => Promise<unknown>): Promise<unknown> {
        const cached = this.assetLoadCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const loadPromise = loader().catch((error) => {
            // Don't keep failed entries cached so future edits can retry.
            this.assetLoadCache.delete(cacheKey);
            throw error;
        });

        this.assetLoadCache.set(cacheKey, loadPromise);
        if (this.assetLoadCache.size > SafeProxyFactory.MAX_ASSET_CACHE_ENTRIES) {
            const oldestKey = this.assetLoadCache.keys().next().value;
            if (oldestKey) {
                this.assetLoadCache.delete(oldestKey);
            }
        }

        return loadPromise;
    }

    private getProxyUrl(src: string): string | null {
        if (!this.options.mediaProxyUrl) return null;
        if (!src) return null;
        if (src.startsWith('data:') || src.startsWith('blob:')) return null;

        try {
            const resolved = new URL(src); // Will throw if src is relative

            // Only proxy absolute http(s) URLs that are cross-origin
            if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;

            const runnerOrigin = new URL(window.location.href).origin;
            if (resolved.origin === runnerOrigin) return null;

            const encoded = encodeURIComponent(resolved.toString());
            return `${this.options.mediaProxyUrl}?url=${encoded}`;
        } catch {
            return null;
        }
    }
}
