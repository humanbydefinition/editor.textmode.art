import { describe, expect, it } from 'vitest';
import { buildGallerySketchCatalog, getGallerySketchCatalog } from './catalog';

const metadata = {
	slug: 'signal-bloom',
	title: 'Signal Bloom',
	description: null,
	authorName: null,
	license: null,
	socialLinks: null,
	createdAt: '2026-07-19T00:00:00.000Z',
};

describe('gallery catalog OG metadata', () => {
	it('contains at least one production sketch', () => {
		expect(getGallerySketchCatalog().length).toBeGreaterThan(0);
	});

	it('accepts an omitted or bounded integer ogFrame and ogDarken', () => {
		expect(buildCatalog(metadata)[0]?.ogFrame).toBeUndefined();
		expect(buildCatalog(metadata)[0]?.ogDarken).toBeUndefined();
		expect(buildCatalog({ ...metadata, ogFrame: 1000 })[0]?.ogFrame).toBe(1000);
		expect(buildCatalog({ ...metadata, ogDarken: 100 })[0]?.ogDarken).toBe(100);
	});

	it('adds the module path to shared metadata validation errors', () => {
		expect(() => buildCatalog({ ...metadata, title: '' })).toThrow(
			'Invalid gallery sketch metadata: /sketches/signal-bloom/meta.json: field "title" must not be empty.'
		);
	});
});

function buildCatalog(meta: Record<string, unknown>) {
	return buildGallerySketchCatalog(
		{ '/sketches/signal-bloom/meta.json': meta },
		{ '/sketches/signal-bloom/sketch.js': 't.draw(() => {});' }
	);
}
