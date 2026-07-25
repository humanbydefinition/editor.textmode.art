export type GalleryOgCard = {
	kind: 'gallery';
	title: string;
	description: string | null;
	authorName: string | null;
};

export type SiteOgCard = {
	kind: 'site';
};

export type OgCard = GalleryOgCard | SiteOgCard;

export interface OgJob {
	slug: string;
	codePath: string;
	frame: number;
	outputPath: string;
	card: OgCard;
}

export interface OgPreviewRequest {
	code: string;
	frame: number;
	card: OgCard;
}

export interface OgPreviewResult {
	frame: number;
	seconds: number;
	descriptionLines: number;
	kind: OgCard['kind'];
}

export interface OgRenderResult extends OgPreviewResult {
	slug: string;
	outputPath: string;
}

export function escapeMarkup(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}
