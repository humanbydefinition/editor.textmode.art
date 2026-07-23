import type { GallerySketchMeta, SocialLink } from './model/metadata';

export type { GallerySketchMeta, SocialLink } from './model/metadata';

export type GallerySketchStatus = 'APPROVED';

export interface GallerySketchSummary {
	status: GallerySketchStatus;
	slug: string;
	title: string;
	description: string | null;
	authorName: string | null;
	license: string | null;
	socialLinks: SocialLink[] | null;
}

export interface GallerySketch extends GallerySketchMeta {
	status: GallerySketchStatus;
	textmodeCode: string;
}
