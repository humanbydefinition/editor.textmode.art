import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SketchRequest } from '@prisma/client';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SlugPageOptions {
  sketch: SketchRequest;
  baseUrl: string;
  devServerUrl?: string;
  renderMode?: 'approved' | 'pending';
}

// Cache for the production HTML template
let cachedProductionHtml: string | null = null;

/**
 * Read the built index.html from dist folder for production.
 */
function getProductionHtmlTemplate(): string | null {
  if (cachedProductionHtml) {
    return cachedProductionHtml;
  }

  const distDir = env.STATIC_DIR
    ? path.resolve(env.STATIC_DIR)
    : path.resolve(__dirname, '../../dist');

  const indexPath = path.join(distDir, 'index.html');

  if (!existsSync(indexPath)) {
    console.warn(`[slug-page] Production index.html not found at: ${indexPath}`);
    return null;
  }

  try {
    cachedProductionHtml = readFileSync(indexPath, 'utf-8');
    return cachedProductionHtml;
  } catch (error) {
    console.error(`[slug-page] Failed to read production index.html:`, error);
    return null;
  }
}

// Escape HTML entities for safe embedding
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate SEO-optimized HTML for a slug page.
 * In production: reads dist/index.html and injects dynamic meta tags.
 * In development: uses a hardcoded template pointing to Vite dev server.
 */
export function renderSlugPage({
  sketch,
  baseUrl,
  devServerUrl: devServerUrlOverride,
  renderMode = 'approved',
}: SlugPageOptions): string {
  const isPending = renderMode === 'pending';
  const title = isPending
    ? 'Sketch Pending Review | synth.textmode.art'
    : `${sketch.title} | synth.textmode.art`;
  const description = isPending
    ? 'This sketch is pending moderation review on synth.textmode.art.'
    : (sketch.description || 'A live coding sketch on synth.textmode.art');
  const canonicalUrl = `${baseUrl}/s/${sketch.slug}`;
  const ogImage = isPending
    ? `${baseUrl}/og-default.png`
    : (sketch.ogImageUrl || `${baseUrl}/og-default.png`);

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeSlug = escapeHtml(sketch.slug);
  const robotsMeta = isPending ? '  <meta name="robots" content="noindex, nofollow" />\n' : '';

  // Dynamic meta tags to inject
  const dynamicHead = `
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
${robotsMeta}  <link rel="canonical" href="${canonicalUrl}" />

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

  <!-- Bootstrap data for SPA -->
  <script>window.__SKETCH_SLUG__ = "${safeSlug}";</script>
`;

  // Production mode: inject into built HTML
  if (env.NODE_ENV === 'production') {
    const productionHtml = getProductionHtmlTemplate();

    if (productionHtml) {
      // Remove existing title and meta tags that we're replacing
      let html = productionHtml
        .replace(/<title>.*?<\/title>/i, '')
        .replace(/<meta\s+name="description"[^>]*>/gi, '')
        .replace(/<meta\s+name="robots"[^>]*>/gi, '')
        .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
        .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
        .replace(/<meta\s+(?:name|property)="twitter:[^"]*"[^>]*>/gi, '');

      // Inject dynamic head content before </head>
      html = html.replace('</head>', `${dynamicHead}</head>`);

      return html;
    }
    // Fall through to dev template if production HTML not available
  }

  const devServerUrl = (devServerUrlOverride || env.VITE_DEV_SERVER_URL || 'http://localhost:5173').replace(/\/$/, '');

  // Development mode: hardcoded template for Vite dev server
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="color-scheme" content="dark" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#09090b" />

  <!-- Prevent white flash -->
  <style>
    html, body { background-color: #09090b; }
  </style>

  <!-- Analytics -->
  <script defer src="https://analytics.textmode.art/script.js" data-website-id="0bb35122-4cf9-4efe-b973-960bc8d3eba4"></script>
${dynamicHead}
</head>
<body>
  <div id="app-container"></div>
  <script type="module" src="${devServerUrl}/@vite/client"></script>
  <script type="module">
    import RefreshRuntime from "${devServerUrl}/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script>
  <script type="module" src="${devServerUrl}/src/main.tsx"></script>
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
