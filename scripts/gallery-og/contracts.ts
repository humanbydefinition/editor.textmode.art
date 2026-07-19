export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const DEFAULT_OG_FRAME = 60;
export const MIN_OG_FRAME = 1;
export const MAX_OG_FRAME = 1000;

export function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

export function formatOgAuthor(authorName: string | null): string {
	return `BY ${authorName?.trim() || 'ANONYMOUS'}`;
}

export function getFittedFontSize(
	measuredWidth: number,
	maxWidth: number,
	initialFontSize: number,
	minimumFontSize: number
): number {
	let fontSize = initialFontSize;
	while (measuredWidth * (fontSize / initialFontSize) > maxWidth && fontSize > minimumFontSize) {
		fontSize = Math.max(minimumFontSize, fontSize - 2);
	}
	return fontSize;
}
