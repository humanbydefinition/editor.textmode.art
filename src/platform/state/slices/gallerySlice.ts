import type { StateCreator } from 'zustand';
import type { GallerySketch } from '@/features/gallery-sketches';
import type { AppState } from '../appStore';

export interface GallerySlice {
	gallerySketch: GallerySketch | null;
	originalGallerySketch: GallerySketch | null;

	setGallerySketch: (sketch: GallerySketch | null) => void;
	clearOriginalGallerySketch: () => void;
}

export const createGallerySlice: StateCreator<
	AppState,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
	[],
	GallerySlice
> = (set) => ({
	gallerySketch: null,
	originalGallerySketch: null,

	setGallerySketch: (sketch) =>
		set(() => {
			if (!sketch) {
				return { gallerySketch: null };
			}

			return {
				gallerySketch: sketch,
				originalGallerySketch: sketch,
			};
		}),

	clearOriginalGallerySketch: () =>
		set({
			gallerySketch: null,
			originalGallerySketch: null,
		}),
});
