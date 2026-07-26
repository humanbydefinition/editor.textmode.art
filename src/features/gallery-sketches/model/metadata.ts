export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 32;
export const GALLERY_TITLE_MAX_LENGTH = 120;
export const GALLERY_DESCRIPTION_MAX_LENGTH = 300;
export const GALLERY_AUTHOR_NAME_MAX_LENGTH = 80;
export const GALLERY_LICENSE_MAX_LENGTH = 120;
export const GALLERY_CREATED_AT_MAX_LENGTH = 64;
export const GALLERY_SOCIAL_LINKS_MAX_COUNT = 6;
export const GALLERY_SOCIAL_LINK_LABEL_MAX_LENGTH = 32;
export const GALLERY_SOCIAL_LINK_URL_MAX_LENGTH = 200;
export const DEFAULT_GALLERY_OG_FRAME = 60;
export const MIN_GALLERY_OG_FRAME = 1;
export const MAX_GALLERY_OG_FRAME = 1000;
export const DEFAULT_GALLERY_OG_DARKEN = 55;
export const MIN_GALLERY_OG_DARKEN = 0;
export const MAX_GALLERY_OG_DARKEN = 100;

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface SocialLink {
	label: string;
	url: string;
}

export interface GallerySketchMeta {
	slug: string;
	title: string;
	description: string | null;
	authorName: string | null;
	license: string | null;
	socialLinks: SocialLink[] | null;
	createdAt: string;
	ogFrame?: number;
	ogDarken?: number;
}

export type GalleryMetadataValidationResult =
	{ valid: true; metadata: GallerySketchMeta } | { valid: false; reason: string };

export function validateSlug(slug: string): { valid: true } | { valid: false; reason: string } {
	if (slug.length < SLUG_MIN_LENGTH) {
		return { valid: false, reason: `Slug must be at least ${SLUG_MIN_LENGTH} characters.` };
	}
	if (slug.length > SLUG_MAX_LENGTH) {
		return { valid: false, reason: `Slug must be at most ${SLUG_MAX_LENGTH} characters.` };
	}
	if (!SLUG_PATTERN.test(slug)) {
		return { valid: false, reason: 'Slug may only contain lowercase letters, numbers, and hyphens.' };
	}
	return { valid: true };
}

export function validateGallerySketchMeta(value: unknown): GalleryMetadataValidationResult {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return invalid('metadata must be an object.');
	}

	const meta = value as Partial<GallerySketchMeta>;
	const slugError = validateRequiredString(meta.slug, 'slug');
	if (slugError) return invalid(slugError);
	const slugValidation = validateSlug(meta.slug as string);
	if (!slugValidation.valid) return invalid(`field "slug" is invalid: ${slugValidation.reason}`);

	const titleError = validateRequiredString(meta.title, 'title', GALLERY_TITLE_MAX_LENGTH);
	if (titleError) return invalid(titleError);
	const descriptionError = validateNullableString(meta.description, 'description', GALLERY_DESCRIPTION_MAX_LENGTH);
	if (descriptionError) return invalid(descriptionError);
	const authorNameError = validateNullableString(meta.authorName, 'authorName', GALLERY_AUTHOR_NAME_MAX_LENGTH);
	if (authorNameError) return invalid(authorNameError);
	const licenseError = validateNullableString(meta.license, 'license', GALLERY_LICENSE_MAX_LENGTH);
	if (licenseError) return invalid(licenseError);
	const createdAtError = validateRequiredString(meta.createdAt, 'createdAt', GALLERY_CREATED_AT_MAX_LENGTH);
	if (createdAtError) return invalid(createdAtError);
	if (Number.isNaN(Date.parse(meta.createdAt as string))) {
		return invalid('field "createdAt" must be an ISO date string.');
	}

	if (
		meta.ogFrame !== undefined &&
		(!Number.isInteger(meta.ogFrame) || meta.ogFrame < MIN_GALLERY_OG_FRAME || meta.ogFrame > MAX_GALLERY_OG_FRAME)
	) {
		return invalid(`field "ogFrame" must be an integer from ${MIN_GALLERY_OG_FRAME} to ${MAX_GALLERY_OG_FRAME}.`);
	}

	if (
		meta.ogDarken !== undefined &&
		(!Number.isInteger(meta.ogDarken) ||
			meta.ogDarken < MIN_GALLERY_OG_DARKEN ||
			meta.ogDarken > MAX_GALLERY_OG_DARKEN)
	) {
		return invalid(
			`field "ogDarken" must be an integer from ${MIN_GALLERY_OG_DARKEN} to ${MAX_GALLERY_OG_DARKEN}.`
		);
	}

	if (meta.socialLinks !== null && !Array.isArray(meta.socialLinks)) {
		return invalid('field "socialLinks" must be an array or null.');
	}
	if (Array.isArray(meta.socialLinks)) {
		if (meta.socialLinks.length > GALLERY_SOCIAL_LINKS_MAX_COUNT) {
			return invalid(`field "socialLinks" must contain at most ${GALLERY_SOCIAL_LINKS_MAX_COUNT} links.`);
		}
		const socialLinkKeys = new Set<string>();
		for (const [index, link] of meta.socialLinks.entries()) {
			const linkError = validateSocialLink(link, index);
			if (linkError) return invalid(linkError);
			const { label, url } = link as SocialLink;
			const key = `${label}\u0000${url}`;
			if (socialLinkKeys.has(key)) {
				return invalid(`socialLinks[${index}] duplicates an earlier link.`);
			}
			socialLinkKeys.add(key);
		}
	}

	return { valid: true, metadata: value as GallerySketchMeta };
}

function invalid(reason: string): GalleryMetadataValidationResult {
	return { valid: false, reason };
}

function validateRequiredString(value: unknown, field: string, maxLength?: number): string | null {
	if (typeof value !== 'string') return `field "${field}" must be a string.`;
	if (value.trim().length === 0) return `field "${field}" must not be empty.`;
	if (maxLength !== undefined && value.length > maxLength) {
		return `field "${field}" must contain at most ${maxLength} characters.`;
	}
	return null;
}

function validateNullableString(value: unknown, field: string, maxLength: number): string | null {
	if (value === null) return null;
	if (typeof value !== 'string') return `field "${field}" must be a string or null.`;
	if (value.length > maxLength) return `field "${field}" must contain at most ${maxLength} characters.`;
	return null;
}

function validateSocialLink(value: unknown, index: number): string | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return `social link #${index + 1} must be an object.`;
	}

	const link = value as Partial<SocialLink>;
	const labelError = validateRequiredString(
		link.label,
		`socialLinks[${index}].label`,
		GALLERY_SOCIAL_LINK_LABEL_MAX_LENGTH
	);
	if (labelError) return labelError;
	const urlError = validateRequiredString(link.url, `socialLinks[${index}].url`, GALLERY_SOCIAL_LINK_URL_MAX_LENGTH);
	if (urlError) return urlError;

	let url: URL;
	try {
		url = new URL(link.url as string);
	} catch {
		return `social link #${index + 1} has an invalid URL.`;
	}
	if (url.protocol !== 'https:') {
		return `social link #${index + 1} must use HTTPS.`;
	}
	return null;
}
