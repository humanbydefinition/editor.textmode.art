const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  's',
  'share',
  'assets',
  'static',
  'favicon',
  'favicon.ico',
  'robots',
  'robots.txt',
  'sitemap',
  'sitemap.xml',
]);

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 64;

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

export function validateSlug(slug: string): { valid: true } | { valid: false; reason: string } {
  if (slug.length < SLUG_MIN_LENGTH) {
    return { valid: false, reason: `Slug must be at least ${SLUG_MIN_LENGTH} characters.` };
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return { valid: false, reason: `Slug must be at most ${SLUG_MAX_LENGTH} characters.` };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, reason: 'Slug may only contain lowercase letters, numbers, and hyphens.' };
  }
  if (isReservedSlug(slug)) {
    return { valid: false, reason: 'Slug is reserved.' };
  }
  return { valid: true };
}
