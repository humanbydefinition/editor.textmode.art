import { describe, expect, it } from 'vitest';
import { getGallerySlugFromPathname } from '../src/features/gallery-sketches/model/slug';

describe('gallery slug paths', () => {
	it('accepts canonical and legacy gallery URLs', () => {
		expect(getGallerySlugFromPathname('/s/signal-bloom')).toBe('signal-bloom');
		expect(getGallerySlugFromPathname('/s/signal-bloom/')).toBe('signal-bloom');
	});

	it('rejects extra path segments', () => {
		expect(getGallerySlugFromPathname('/s/signal-bloom/edit')).toBeNull();
	});
});
