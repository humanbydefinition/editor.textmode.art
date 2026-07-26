import { beforeEach, describe, expect, it } from 'vitest';
import { makeGallerySketch } from '../../../tests/support/gallery-fixtures';
import { useAppStore } from './appStore';

const sketch = makeGallerySketch();

describe('app store', () => {
	beforeEach(() => {
		useAppStore.getState().clearGallerySketches();
	});

	it('retains the original gallery sketch while the active sketch is cleared', () => {
		useAppStore.getState().setGallerySketch(sketch);
		useAppStore.getState().setGallerySketch(null);

		expect(useAppStore.getState().gallerySketch).toBeNull();
		expect(useAppStore.getState().originalGallerySketch).toBe(sketch);

		useAppStore.getState().clearGallerySketches();
		expect(useAppStore.getState().originalGallerySketch).toBeNull();
	});
});
