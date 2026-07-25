import brandMarkSvg from './assets/textmode-editor-logo.svg?raw';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

let brandMarkPath: string | null = null;

export function getBrandMarkPath(): string {
	if (brandMarkPath) return brandMarkPath;

	const document_ = new DOMParser().parseFromString(brandMarkSvg, 'image/svg+xml');
	const path = document_.querySelector('path')?.getAttribute('d');
	if (!path) throw new Error('The editor brand mark SVG does not contain a path.');
	brandMarkPath = path;
	return path;
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

export function fitSvgText(
	text: SVGTextElement,
	maxWidth: number,
	initialFontSize: number,
	minimumFontSize: number
): void {
	const fontSize = getFittedFontSize(text.getComputedTextLength(), maxWidth, initialFontSize, minimumFontSize);
	text.setAttribute('font-size', String(fontSize));
	while (text.getComputedTextLength() > maxWidth && (text.textContent?.length ?? 0) > 1) {
		text.textContent = `${text.textContent?.slice(0, -2)}…`;
	}
}

export function fitSvgTextPreservingChildren(
	text: SVGTextElement,
	maxWidth: number,
	initialFontSize: number,
	minimumFontSize: number
): void {
	const fontSize = getFittedFontSize(text.getComputedTextLength(), maxWidth, initialFontSize, minimumFontSize);
	text.setAttribute('font-size', String(fontSize));
}

export function measureSvgText(text: SVGTextElement, value: string): number {
	text.textContent = value;
	return text.getComputedTextLength();
}

export function placeSvgTextBottom(text: SVGTextElement, bottom: number): number {
	const bounds = text.getBBox();
	const offsetY = bottom - (bounds.y + bounds.height);
	text.setAttribute('transform', `translate(0 ${offsetY})`);
	return bounds.y + offsetY;
}

export function getSvgText(id: string): SVGTextElement | null {
	const element = document.getElementById(id);
	return element instanceof SVGTextElement ? element : null;
}
