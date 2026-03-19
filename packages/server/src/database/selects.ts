/**
 * Named Prisma `select` objects.
 */

/** Columns needed by the public sketch-read API endpoints. */
export const publicSketchSelect = {
  id: true,
  slug: true,
  status: true,
  title: true,
  description: true,
  authorName: true,
  license: true,
  socialLinks: true,
  textmodeCode: true,
  ogImageUrl: true,
  createdAt: true,
} as const;

/** Columns needed by the slug SSR page (SEO meta only — no code). */
export const slugPageSelect = {
  slug: true,
  status: true,
  title: true,
  description: true,
  ogImageUrl: true,
} as const;

/** Minimal select for existence checks. */
export const existsSelect = {
  id: true,
} as const;

/** Minimal select for the submission-created response. */
export const submissionResultSelect = {
  id: true,
  slug: true,
  status: true,
  createdAt: true,
} as const;
