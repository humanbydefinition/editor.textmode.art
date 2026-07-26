import type { GallerySketchMeta } from './model/metadata';

export type { GallerySketchMeta, SocialLink } from './model/metadata';

export interface GallerySketch extends GallerySketchMeta {
	textmodeCode: string;
}
