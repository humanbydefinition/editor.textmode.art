import { describe, expect, it } from 'vitest';
import { buildGallerySketchCatalog } from '../src/features/gallery-sketches/model/catalog';

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
	it('accepts an omitted or bounded integer ogFrame', () => {
		expect(buildCatalog(metadata)[0]?.ogFrame).toBeUndefined();
		expect(buildCatalog({ ...metadata, ogFrame: 1000 })[0]?.ogFrame).toBe(1000);
	});

	it('rejects out-of-range and fractional ogFrame values', () => {
		expect(() => buildCatalog({ ...metadata, ogFrame: 0 })).toThrow('integer from 1 to 1000');
		expect(() => buildCatalog({ ...metadata, ogFrame: 1.5 })).toThrow('integer from 1 to 1000');
	});
});

function buildCatalog(meta: Record<string, unknown>) {
	return buildGallerySketchCatalog(
		{ '/sketches/signal-bloom/meta.json': meta },
		{ '/sketches/signal-bloom/sketch.js': 't.draw(() => {});' }
	);
}
