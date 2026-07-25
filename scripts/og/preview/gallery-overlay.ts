import { escapeMarkup, type GalleryOgCard } from '../contracts';
import { OG_HEIGHT, OG_WIDTH } from '../config';
import {
	SVG_NAMESPACE,
	fitSvgText,
	getBrandMarkPath,
	getFittedFontSize,
	getSvgText,
	measureSvgText,
	placeSvgTextBottom,
} from './svg-text';

const METADATA_LEFT = 48;
const METADATA_TOP = 164;
const METADATA_BOTTOM = OG_HEIGHT - 48;
const METADATA_MAX_WIDTH = OG_WIDTH - METADATA_LEFT * 2;
const DESCRIPTION_MAX_WIDTH = 720;
const TITLE_DESCRIPTION_GAP = 14;
const DESCRIPTION_AUTHOR_GAP = 12;
const TITLE_FONT_SIZE = 96;
const TITLE_MIN_FONT_SIZE = 48;
const DESCRIPTION_FONT_SIZE = 44;
const DESCRIPTION_MIN_FONT_SIZE = 24;
const DESCRIPTION_LINE_HEIGHT = 0.88;
const AUTHOR_FONT_SIZE = 32;
const AUTHOR_MIN_FONT_SIZE = 20;
const BRAND_FONT_SIZE = 40;
const BRAND_MARK_SIZE = 24;
const CORNER_LABEL_FONT_SIZE = 36;

export interface MountedGalleryOverlay {
	fit(): number;
	assert(): void;
}

export function mountGalleryOverlay(card: GalleryOgCard): MountedGalleryOverlay {
	const displayAuthorName = card.authorName?.trim() || 'anonymous';
	const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
	svg.id = 'og-overlay';
	svg.dataset.layout = 'gallery';
	svg.setAttribute('width', String(OG_WIDTH));
	svg.setAttribute('height', String(OG_HEIGHT));
	svg.setAttribute('viewBox', `0 0 ${OG_WIDTH} ${OG_HEIGHT}`);
	svg.innerHTML = `
		<defs>
			<linearGradient id="top-scrim" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#000" stop-opacity="0.76" />
				<stop offset="1" stop-color="#000" stop-opacity="0" />
			</linearGradient>
			<linearGradient id="bottom-scrim" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#000" stop-opacity="0" />
				<stop offset="0.25" stop-color="#000" stop-opacity="0.55" />
				<stop offset="0.5" stop-color="#000" stop-opacity="0.78" />
				<stop offset="1" stop-color="#000" stop-opacity="0.96" />
			</linearGradient>
		</defs>
		<rect width="1200" height="150" fill="url(#top-scrim)" />
		<rect y="120" width="1200" height="510" fill="url(#bottom-scrim)" />
		<g transform="translate(48 49) scale(${BRAND_MARK_SIZE / 768})" fill="#f2f2ec"><path d="${getBrandMarkPath()}" /></g>
		<text x="88" y="67" fill="#f2f2ec" font-family="Monogram Extended" font-size="${BRAND_FONT_SIZE}">editor.textmode.art</text>
		<text x="1152" y="67" fill="#d8d8d2" font-family="Monogram Extended" font-size="${CORNER_LABEL_FONT_SIZE}" text-anchor="end" letter-spacing="1">GALLERY SKETCH</text>
		<text id="gallery-og-title" x="${METADATA_LEFT}" y="0" fill="#f2f2ec" font-family="Monogram Extended" font-size="${TITLE_FONT_SIZE}" font-style="italic">${escapeMarkup(card.title)}</text>
		<text id="gallery-og-description" x="${METADATA_LEFT}" y="0" fill="#b8b8b2" font-family="Monogram Extended" font-size="${DESCRIPTION_FONT_SIZE}">${escapeMarkup(card.description?.trim() ?? '')}</text>
		<text id="gallery-og-author" x="${METADATA_LEFT}" y="0" fill="#8e8e88" font-family="Monogram Extended" font-size="${AUTHOR_FONT_SIZE}" letter-spacing="1"><tspan>by </tspan><tspan id="gallery-og-author-name" fill="#d8d8d2" font-style="italic">${escapeMarkup(displayAuthorName)}</tspan></text>
	`;
	document.body.appendChild(svg);
	assertGalleryMetadataContent(card);

	return {
		fit: fitGalleryMetadata,
		assert: assertGalleryMetadataLayout,
	};
}

function fitGalleryMetadata(): number {
	const title = getSvgText('gallery-og-title');
	const description = getSvgText('gallery-og-description');
	const author = getSvgText('gallery-og-author');
	if (!title || !description || !author) return 0;

	fitSvgText(title, METADATA_MAX_WIDTH, TITLE_FONT_SIZE, TITLE_MIN_FONT_SIZE);
	fitAuthorText(author, METADATA_MAX_WIDTH, AUTHOR_FONT_SIZE, AUTHOR_MIN_FONT_SIZE);

	const descriptionValue = description.textContent?.trim() ?? '';
	let descriptionFontSize = DESCRIPTION_FONT_SIZE;
	let descriptionLines = wrapSvgText(description, descriptionValue, DESCRIPTION_MAX_WIDTH, descriptionFontSize);
	const fixedHeight = title.getBBox().height + author.getBBox().height;
	const gaps = descriptionLines > 0 ? TITLE_DESCRIPTION_GAP + DESCRIPTION_AUTHOR_GAP : TITLE_DESCRIPTION_GAP;
	const availableDescriptionHeight = METADATA_BOTTOM - METADATA_TOP - fixedHeight - gaps;

	while (
		descriptionLines > 0 &&
		description.getBBox().height > availableDescriptionHeight &&
		descriptionFontSize > DESCRIPTION_MIN_FONT_SIZE
	) {
		descriptionFontSize = Math.max(DESCRIPTION_MIN_FONT_SIZE, descriptionFontSize - 2);
		descriptionLines = wrapSvgText(description, descriptionValue, DESCRIPTION_MAX_WIDTH, descriptionFontSize);
	}

	if (descriptionLines > 0 && description.getBBox().height > availableDescriptionHeight) {
		descriptionLines = clampSvgTextLines(
			description,
			descriptionLines,
			availableDescriptionHeight,
			DESCRIPTION_MAX_WIDTH
		);
	}

	const authorTop = placeSvgTextBottom(author, METADATA_BOTTOM);
	const descriptionTop =
		descriptionLines > 0 ? placeSvgTextBottom(description, authorTop - DESCRIPTION_AUTHOR_GAP) : authorTop;
	placeSvgTextBottom(title, descriptionTop - TITLE_DESCRIPTION_GAP);
	description.dataset.lineCount = String(descriptionLines);

	return descriptionLines;
}

function fitAuthorText(text: SVGTextElement, maxWidth: number, initialFontSize: number, minimumFontSize: number): void {
	const fontSize = getFittedFontSize(text.getComputedTextLength(), maxWidth, initialFontSize, minimumFontSize);
	text.setAttribute('font-size', String(fontSize));
	const authorName = document.getElementById('gallery-og-author-name');
	if (!(authorName instanceof SVGTSpanElement)) return;
	while (text.getComputedTextLength() > maxWidth && (authorName.textContent?.length ?? 0) > 1) {
		authorName.textContent = `${authorName.textContent?.slice(0, -2)}…`;
	}
}

function wrapSvgText(text: SVGTextElement, value: string, maxWidth: number, fontSize: number): number {
	text.removeAttribute('transform');
	text.setAttribute('font-size', String(fontSize));
	text.replaceChildren();
	const lines: string[] = [];
	let remaining = value.replace(/\s+/g, ' ').trim();

	while (remaining) {
		if (measureSvgText(text, remaining) <= maxWidth) {
			lines.push(remaining);
			break;
		}

		let low = 1;
		let high = remaining.length;
		while (low < high) {
			const middle = Math.ceil((low + high) / 2);
			if (measureSvgText(text, remaining.slice(0, middle)) <= maxWidth) low = middle;
			else high = middle - 1;
		}

		const fittingPrefix = remaining.slice(0, Math.max(1, low));
		const lastSpace = fittingPrefix.lastIndexOf(' ');
		const breakAt = lastSpace > 0 ? lastSpace : Math.max(1, low);
		lines.push(remaining.slice(0, breakAt).trimEnd());
		remaining = remaining.slice(breakAt).trimStart();
	}

	renderSvgTextLines(text, lines, fontSize);
	return lines.length;
}

function clampSvgTextLines(text: SVGTextElement, lineCount: number, maxHeight: number, maxWidth: number): number {
	const fontSize = Number(text.getAttribute('font-size')) || DESCRIPTION_MIN_FONT_SIZE;
	const lineHeight = fontSize * DESCRIPTION_LINE_HEIGHT;
	const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
	if (lineCount <= maxLines) return lineCount;

	const lines = Array.from(text.querySelectorAll('tspan'), (line) => line.textContent ?? '').slice(0, maxLines);
	let finalLine = `${lines.at(-1)?.replace(/…?$/, '') ?? ''}…`;
	while (measureSvgText(text, finalLine) > maxWidth && finalLine.length > 1) {
		finalLine = `${finalLine.slice(0, -2)}…`;
	}
	lines[lines.length - 1] = finalLine;
	renderSvgTextLines(text, lines, fontSize);
	return lines.length;
}

function renderSvgTextLines(text: SVGTextElement, lines: string[], fontSize: number): void {
	text.replaceChildren(
		...lines.map((line, index) => {
			const tspan = document.createElementNS(SVG_NAMESPACE, 'tspan');
			tspan.setAttribute('x', String(METADATA_LEFT));
			tspan.setAttribute('dy', index === 0 ? '0' : String(fontSize * DESCRIPTION_LINE_HEIGHT));
			tspan.textContent = line;
			return tspan;
		})
	);
}

function assertGalleryMetadataContent(card: GalleryOgCard): void {
	const overlayText = document.getElementById('og-overlay')?.textContent ?? '';
	if (
		!overlayText.includes(card.title) ||
		(card.description !== null && !overlayText.includes(card.description.trim())) ||
		!overlayText.includes(`by ${card.authorName?.trim() || 'anonymous'}`)
	) {
		throw new Error('Gallery OG metadata overlay is missing expected content.');
	}
}

function assertGalleryMetadataLayout(): void {
	const title = getSvgText('gallery-og-title');
	const description = getSvgText('gallery-og-description');
	const author = getSvgText('gallery-og-author');
	if (!title || !description || !author) throw new Error('Gallery OG metadata overlay is incomplete.');

	const titleBounds = title.getBoundingClientRect();
	const descriptionBounds = description.getBoundingClientRect();
	const authorBounds = author.getBoundingClientRect();
	const descriptionLines = Number(description.dataset.lineCount ?? 0);
	const tolerance = 1;

	if (titleBounds.top < METADATA_TOP - tolerance || authorBounds.bottom > METADATA_BOTTOM + tolerance) {
		throw new Error('Gallery OG metadata escaped its vertical safe area.');
	}
	if (
		titleBounds.right > OG_WIDTH - METADATA_LEFT + tolerance ||
		authorBounds.right > OG_WIDTH - METADATA_LEFT + tolerance
	) {
		throw new Error('Gallery OG single-line metadata escaped its horizontal safe area.');
	}
	if (descriptionLines > 0) {
		if (descriptionBounds.width > DESCRIPTION_MAX_WIDTH + tolerance) {
			throw new Error('Gallery OG description exceeded its wrapping width.');
		}
		if (
			titleBounds.bottom > descriptionBounds.top - TITLE_DESCRIPTION_GAP + tolerance ||
			descriptionBounds.bottom > authorBounds.top - DESCRIPTION_AUTHOR_GAP + tolerance
		) {
			throw new Error('Gallery OG metadata labels overlap.');
		}
	} else if (titleBounds.bottom > authorBounds.top - TITLE_DESCRIPTION_GAP + tolerance) {
		throw new Error('Gallery OG title and author overlap.');
	}
}
