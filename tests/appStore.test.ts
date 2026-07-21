import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/platform/state/appStore';
import { DEFAULT_SETTINGS } from '../src/types';
import type { GallerySketch } from '../src/features/gallery-sketches';

const sketch: GallerySketch = {
	status: 'APPROVED',
	slug: 'example',
	title: 'Example',
	description: null,
	authorName: null,
	license: null,
	socialLinks: null,
	createdAt: '2026-07-21T00:00:00.000Z',
	textmodeCode: 't.draw(() => {});',
};

describe('app store', () => {
	beforeEach(() => {
		useAppStore.getState().setSettings(DEFAULT_SETTINGS);
		useAppStore.getState().clearOriginalGallerySketch();
	});

	it('merges settings patches without requiring callers to copy the full object', () => {
		useAppStore.getState().updateSettings({ fontSize: 24 });

		expect(useAppStore.getState().settings).toEqual({
			...DEFAULT_SETTINGS,
			fontSize: 24,
		});
	});

	it('retains the original gallery sketch while the active sketch is cleared', () => {
		useAppStore.getState().setGallerySketch(sketch);
		useAppStore.getState().setGallerySketch(null);

		expect(useAppStore.getState().gallerySketch).toBeNull();
		expect(useAppStore.getState().originalGallerySketch).toBe(sketch);

		useAppStore.getState().clearOriginalGallerySketch();
		expect(useAppStore.getState().originalGallerySketch).toBeNull();
	});
});
