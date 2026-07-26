export { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, validateSlug } from './metadata';

export function normalizeSlug(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function getGallerySlugFromPathname(pathname: string): string | null {
	const match = pathname.match(/^\/s\/([a-z0-9-]+)\/?$/i);
	return match?.[1] ?? null;
}
