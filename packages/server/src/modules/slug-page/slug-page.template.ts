import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SlugPageSketch {
  slug: string;
  status: string;
  title: string;
  description: string | null;
  ogImageUrl: string | null;
}

export interface Logger {
  warn(msg: string): void;
  error(msg: string | Record<string, unknown>, ...args: unknown[]): void;
}

const defaultLogger: Logger = {
  warn: (msg) => console.warn(msg),
  error: (msg, ...args) => console.error(msg, ...args),
};

export interface SlugPageOptions {
  sketch: SlugPageSketch;
  baseUrl: string;
  devServerUrl?: string;
  renderMode?: 'approved' | 'pending';
  logger?: Logger;
}

// Cache for the production HTML template
let cachedProductionHtml: string | null = null;

/**
 * Read the built index.html from dist folder for production.
 */
function getProductionHtmlTemplate(log: Logger): string | null {
  if (cachedProductionHtml) {
    return cachedProductionHtml;
  }

  const distDir = env.STATIC_DIR
    ? path.resolve(env.STATIC_DIR)
    : path.resolve(__dirname, '../../../dist');

  const indexPath = path.join(distDir, 'index.html');

  if (!existsSync(indexPath)) {
    log.warn(`[slug-page] Production index.html not found at: ${indexPath}`);
    return null;
  }

  try {
    cachedProductionHtml = readFileSync(indexPath, 'utf-8');
    return cachedProductionHtml;
  } catch (error) {
    log.error(`[slug-page] Failed to read production index.html:`, error as Error);
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

function toAbsoluteAssetUrl(assetUrl: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(assetUrl)) {
    return assetUrl;
  }
  if (assetUrl.startsWith('/')) {
    return `${baseUrl}${assetUrl}`;
  }
  return `${baseUrl}/${assetUrl}`;
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
  logger = defaultLogger,
}: SlugPageOptions): string {
  const isPending = renderMode === 'pending';
  const title = isPending
    ? 'sketch pending review | synth.textmode.art'
    : `${sketch.title} | synth.textmode.art`;
  const description = isPending
    ? 'This sketch is pending moderation review on synth.textmode.art.'
    : (sketch.description || 'A live coding sketch on synth.textmode.art');
  const canonicalUrl = `${baseUrl}/s/${sketch.slug}`;
  const ogImage = isPending
    ? `${baseUrl}/og-default.png`
    : (sketch.ogImageUrl ? toAbsoluteAssetUrl(sketch.ogImageUrl, baseUrl) : `${baseUrl}/og-default.png`);

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeSlug = escapeHtml(sketch.slug);
  const robotsMeta = isPending ? '  <meta name="robots" content="noindex, nofollow" />\n' : '';
  const legalFallbackMarkup = `
  <noscript>
    <footer data-synth-legal-fallback style="padding:12px 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:12px; color:#a1a1aa; background:#09090b; border-top:1px solid rgba(255,255,255,0.08);">
      <a href="/imprint" style="color:#a1a1aa; margin-right:12px;">Imprint</a>
      <a href="/tos" style="color:#a1a1aa; margin-right:12px;">Terms</a>
      <a href="/privacy" style="color:#a1a1aa; margin-right:12px;">Privacy</a>
      <a href="/contact" style="color:#a1a1aa;">Contact</a>
    </footer>
  </noscript>
`;

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
    const productionHtml = getProductionHtmlTemplate(logger);

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
      html = html.replace('</body>', `${legalFallbackMarkup}</body>`);

      return html;
    }
    // Fall through to dev template if production HTML not available
  }

  const devServerUrl = (devServerUrlOverride || env.VITE_DEV_SERVER_URL || 'http://localhost:5180').replace(/\/$/, '');

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

${dynamicHead}
</head>
<body>
  <div id="app-container"></div>
${legalFallbackMarkup}
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
