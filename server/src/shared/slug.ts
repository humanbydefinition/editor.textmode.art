import type { SketchStatus } from '@synth.textmode.art/contracts/sketch';
import { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH } from '@synth.textmode.art/contracts/sketch';
import { prisma } from '../database/client.js';
import { existsSelect } from '../database/selects.js';

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

/** Sketch statuses that "occupy" a slug (i.e. prevent reuse). */
export const ACTIVE_SKETCH_STATUSES: SketchStatus[] = ['PENDING', 'APPROVED'];

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

/** Check whether a slug is already in use by an active (PENDING | APPROVED) sketch. */
export async function isSlugTaken(slug: string): Promise<boolean> {
  const existing = await prisma.sketchRequest.findFirst({
    where: { slug, status: { in: ACTIVE_SKETCH_STATUSES } },
    select: existsSelect,
  });
  return Boolean(existing);
}
