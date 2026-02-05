import type { SketchRequest } from '@prisma/client';
import { env } from '../config/env.js';

export interface SlugPageOptions {
    sketch: SketchRequest;
    baseUrl: string;
}

/**
 * Generate SEO-optimized HTML for a slug page.
 * Includes Open Graph + Twitter Card meta tags and bootstraps the SPA.
 */
export function renderSlugPage({ sketch, baseUrl }: SlugPageOptions): string {
    const title = `${sketch.title} | synth.textmode.art`;
    const description = sketch.description || 'A live coding sketch on synth.textmode.art';
    const canonicalUrl = `${baseUrl}/s/${sketch.slug}`;
    const ogImage = sketch.ogImageUrl || `${baseUrl}/og-default.png`;

    // Escape HTML entities for safe embedding
    const escapeHtml = (str: string) =>
        str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeSlug = escapeHtml(sketch.slug);

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="color-scheme" content="dark" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />

  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <meta name="theme-color" content="#09090b" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:site_name" content="synth.textmode.art" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${canonicalUrl}" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${ogImage}" />

  <!-- Prevent white flash -->
  <style>
    html, body { background-color: #09090b; }
  </style>

  <!-- Analytics -->
  <script defer src="https://analytics.textmode.art/script.js" data-website-id="0bb35122-4cf9-4efe-b973-960bc8d3eba4"></script>

  <!-- Bootstrap data for SPA -->
  <script>window.__SKETCH_SLUG__ = "${safeSlug}";</script>
</head>
<body>
  <div id="app-container"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

/**
 * Get the base URL for canonical links.
 * Uses PUBLIC_BASE_URL env var in production, falls back to request origin.
 */
export function getBaseUrl(requestHost: string, protocol = 'https'): string {
    if (env.PUBLIC_BASE_URL) {
        return env.PUBLIC_BASE_URL.replace(/\/$/, '');
    }
    return `${protocol}://${requestHost}`;
}
