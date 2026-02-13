/**
 * Named Prisma `select` objects.
 *
 * Defence-in-depth: queries that serve public endpoints should never fetch
 * more columns than the response mapper actually needs. Centralising the
 * select objects here makes it easy to audit what leaves the database and
 * ensures a new column in the Prisma schema doesn't leak by default.
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
  strudelCode: true,
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
