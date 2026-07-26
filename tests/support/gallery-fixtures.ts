import type { GallerySketch } from '../../src/features/gallery-sketches';

export function makeGallerySketch(overrides: Partial<GallerySketch> = {}): GallerySketch {
	return {
		slug: 'example',
		title: 'Example',
		description: null,
		authorName: null,
		license: null,
		socialLinks: null,
		createdAt: '2026-07-21T00:00:00.000Z',
		textmodeCode: 't.draw(() => {});',
		...overrides,
	};
}
