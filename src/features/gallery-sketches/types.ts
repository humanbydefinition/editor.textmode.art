export interface SocialLink {
	label: string;
	url: string;
}

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

export interface GallerySketch extends GallerySketchSummary {
	textmodeCode: string;
	createdAt: string;
	ogFrame?: number;
}

export type GallerySketchMeta = Omit<GallerySketch, 'textmodeCode' | 'status'>;
