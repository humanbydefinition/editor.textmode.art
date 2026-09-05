import { describe, expect, it } from 'vitest';
import {
	GALLERY_AUTHOR_NAME_MAX_LENGTH,
	GALLERY_CREATED_AT_MAX_LENGTH,
	GALLERY_DESCRIPTION_MAX_LENGTH,
	GALLERY_LICENSE_MAX_LENGTH,
	GALLERY_SOCIAL_LINK_LABEL_MAX_LENGTH,
	GALLERY_SOCIAL_LINK_URL_MAX_LENGTH,
	GALLERY_SOCIAL_LINKS_MAX_COUNT,
	GALLERY_TITLE_MAX_LENGTH,
	MAX_GALLERY_OG_DARKEN,
	MAX_GALLERY_OG_FRAME,
	SLUG_MAX_LENGTH,
	SLUG_MIN_LENGTH,
	validateGallerySketchMeta,
	validateSlug,
	type GallerySketchMeta,
} from './metadata';

const validMetadata: GallerySketchMeta = {
	slug: 'signal-bloom',
	title: 'Signal Bloom',
	description: 'A gallery sketch.',
	authorName: 'Test Artist',
	license: 'MIT',
	socialLinks: [{ label: 'Website', url: 'https://example.com' }],
	createdAt: '2026-05-16T00:00:00.000Z',
	ogFrame: 60,
	ogDarken: 55,
};

describe('gallery metadata contract', () => {
	it('returns validated metadata without transforming it', () => {
		expect(validateGallerySketchMeta(validMetadata)).toEqual({
			valid: true,
			metadata: validMetadata,
		});
		expect(validateGallerySketchMeta({ ...validMetadata, interactive: true })).toEqual({
			valid: true,
			metadata: { ...validMetadata, interactive: true },
		});
		expect(validateGallerySketchMeta({ ...validMetadata, interactive: false })).toEqual({
			valid: true,
			metadata: { ...validMetadata, interactive: false },
		});
	});

	it.each([
		['a non-object value', null, 'metadata must be an object'],
		['a short slug', { slug: 'a'.repeat(SLUG_MIN_LENGTH - 1) }, `at least ${SLUG_MIN_LENGTH}`],
		['a long slug', { slug: 'a'.repeat(SLUG_MAX_LENGTH + 1) }, `at most ${SLUG_MAX_LENGTH}`],
		['a non-canonical slug', { slug: 'Signal_Bloom' }, 'lowercase letters, numbers, and hyphens'],
		['an empty title', { title: ' ' }, 'field "title" must not be empty'],
		[
			'a long title',
			{ title: 'a'.repeat(GALLERY_TITLE_MAX_LENGTH + 1) },
			`at most ${GALLERY_TITLE_MAX_LENGTH} characters`,
		],
		[
			'a long description',
			{ description: 'a'.repeat(GALLERY_DESCRIPTION_MAX_LENGTH + 1) },
			`at most ${GALLERY_DESCRIPTION_MAX_LENGTH} characters`,
		],
		[
			'a long author name',
			{ authorName: 'a'.repeat(GALLERY_AUTHOR_NAME_MAX_LENGTH + 1) },
			`at most ${GALLERY_AUTHOR_NAME_MAX_LENGTH} characters`,
		],
		[
			'a long license',
			{ license: 'a'.repeat(GALLERY_LICENSE_MAX_LENGTH + 1) },
			`at most ${GALLERY_LICENSE_MAX_LENGTH} characters`,
		],
		[
			'a long creation date',
			{ createdAt: 'a'.repeat(GALLERY_CREATED_AT_MAX_LENGTH + 1) },
			`at most ${GALLERY_CREATED_AT_MAX_LENGTH} characters`,
		],
		['an invalid creation date', { createdAt: 'not-a-date' }, 'must be an ISO date string'],
		['a fractional OG frame', { ogFrame: 1.5 }, 'must be an integer from 1 to 1000'],
		['an out-of-range OG frame', { ogFrame: MAX_GALLERY_OG_FRAME + 1 }, 'must be an integer from 1 to 1000'],
		['a fractional OG darken', { ogDarken: 0.5 }, 'must be an integer from 0 to 100'],
		['an out-of-range OG darken', { ogDarken: MAX_GALLERY_OG_DARKEN + 1 }, 'must be an integer from 0 to 100'],
		['a string interactive property', { interactive: 'true' as unknown as boolean }, 'must be a boolean'],
		['a numeric interactive property', { interactive: 1 as unknown as boolean }, 'must be a boolean'],
		['a null interactive property', { interactive: null as unknown as boolean }, 'must be a boolean'],
		['missing social links', { socialLinks: undefined }, 'must be an array or null'],
		[
			'too many social links',
			{
				socialLinks: Array.from({ length: GALLERY_SOCIAL_LINKS_MAX_COUNT + 1 }, () => ({
					label: 'Website',
					url: 'https://example.com',
				})),
			},
			`at most ${GALLERY_SOCIAL_LINKS_MAX_COUNT} links`,
		],
		[
			'a long social label',
			{
				socialLinks: [
					{ label: 'a'.repeat(GALLERY_SOCIAL_LINK_LABEL_MAX_LENGTH + 1), url: 'https://example.com' },
				],
			},
			`at most ${GALLERY_SOCIAL_LINK_LABEL_MAX_LENGTH} characters`,
		],
		[
			'a long social URL',
			{
				socialLinks: [
					{ label: 'Website', url: `https://example.com/${'a'.repeat(GALLERY_SOCIAL_LINK_URL_MAX_LENGTH)}` },
				],
			},
			`at most ${GALLERY_SOCIAL_LINK_URL_MAX_LENGTH} characters`,
		],
		['an invalid social URL', { socialLinks: [{ label: 'Website', url: 'not-a-url' }] }, 'has an invalid URL'],
		[
			'a non-HTTPS social URL',
			{ socialLinks: [{ label: 'Website', url: 'http://example.com' }] },
			'must use HTTPS',
		],
		[
			'a duplicate social link',
			{
				socialLinks: [
					{ label: 'Website', url: 'https://example.com' },
					{ label: 'Website', url: 'https://example.com' },
				],
			},
			'duplicates an earlier link',
		],
	])('rejects %s', (_label, value, expectedReason) => {
		const candidate = value === null ? null : { ...validMetadata, ...(value as Partial<GallerySketchMeta>) };
		expect(getValidationReason(candidate)).toContain(expectedReason);
	});

	it('uses the same slug validation result exposed to browser callers', () => {
		expect(validateSlug('signal-bloom')).toEqual({ valid: true });
		expect(validateSlug('Signal_Bloom')).toEqual({
			valid: false,
			reason: 'Slug may only contain lowercase letters, numbers, and hyphens.',
		});
	});
});

function getValidationReason(value: unknown): string {
	const result = validateGallerySketchMeta(value);
	if (result.valid) {
		throw new Error('Expected gallery metadata to be invalid');
	}
	return result.reason;
}
