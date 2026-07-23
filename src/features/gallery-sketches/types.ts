import type { GallerySketchMeta, SocialLink } from './model/metadata';

export type { GallerySketchMeta, SocialLink } from './model/metadata';

export interface GallerySketchSummary {
	slug: string;
	title: string;
	description: string | null;
	authorName: string | null;
	license: string | null;
	socialLinks: SocialLink[] | null;
}

export interface GallerySketch extends GallerySketchMeta {
	textmodeCode: string;
}
