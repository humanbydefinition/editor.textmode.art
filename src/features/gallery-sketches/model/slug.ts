export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 32;

export function normalizeSlug(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
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
	return { valid: true };
}

export function getGallerySlugFromPathname(pathname: string): string | null {
	const match = pathname.match(/^\/s\/([a-z0-9-]+)\/?$/i);
	return match?.[1] ?? null;
}
