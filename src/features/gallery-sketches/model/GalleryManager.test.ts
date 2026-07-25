import { describe, expect, it, vi } from 'vitest';
import { makeGallerySketch } from '../../../../tests/support/gallery-fixtures';
import type { GallerySketch } from '../types';
import { GalleryManager, type GalleryManagerDependencies } from './GalleryManager';

describe('GalleryManager', () => {
	it('clears a customized sketch and restores it when its original code returns', () => {
		const sketch = makeGallerySketch();
		let activeSketch: GallerySketch | null = sketch;
		let originalSketch: GallerySketch | null = sketch;
		const setGallerySketch = vi.fn((nextSketch: GallerySketch | null) => {
			activeSketch = nextSketch;
			if (nextSketch) originalSketch = nextSketch;
		});
		const manager = new GalleryManager({
			getGallerySketch: () => activeSketch,
			getOriginalGallerySketch: () => originalSketch,
			setGallerySketch,
			clearGallerySketches: vi.fn(),
			setSharePayload: vi.fn(),
			setError: vi.fn(),
			applyGallerySketch: vi.fn(),
			replaceUrl: vi.fn(),
		} satisfies GalleryManagerDependencies);

		manager.syncActiveSketchWithCode('custom code');
		expect(activeSketch).toBeNull();

		manager.syncActiveSketchWithCode(sketch.textmodeCode);
		expect(activeSketch).toBe(sketch);
	});
});
