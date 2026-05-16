import type { StateCreator } from 'zustand';
import type { GallerySketch, GallerySketchSummary } from '@/features/gallery-sketches';
import type { AppState } from '../appStore';

export interface GallerySlice {
	gallerySketch: GallerySketch | null;
	gallerySketchSummary: GallerySketchSummary | null;
	originalGallerySketch: GallerySketch | null;
	originalGallerySketchSummary: GallerySketchSummary | null;

	setGallerySketch: (sketch: GallerySketch | null) => void;
	setGallerySketchSummary: (summary: GallerySketchSummary | null) => void;
	clearOriginalGallerySketch: () => void;
}

export const createGallerySlice: StateCreator<
	AppState,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
	[],
	GallerySlice
> = (set) => ({
	gallerySketch: null,
	gallerySketchSummary: null,
	originalGallerySketch: null,
	originalGallerySketchSummary: null,

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

	setGallerySketchSummary: (summary) =>
		set(() => {
			if (!summary) {
				return { gallerySketchSummary: null };
			}

			return {
				gallerySketchSummary: summary,
				originalGallerySketchSummary: summary,
			};
		}),

	clearOriginalGallerySketch: () =>
		set({
			gallerySketch: null,
			gallerySketchSummary: null,
			originalGallerySketch: null,
			originalGallerySketchSummary: null,
		}),
});
