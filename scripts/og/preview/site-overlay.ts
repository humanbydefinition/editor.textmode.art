import { OG_HEIGHT, OG_WIDTH } from '../config';
import { SVG_NAMESPACE, getBrandMarkPath, getFittedFontSize, getSvgText } from './svg-text';

const SAFE_INSET = 48;
const VERTICAL_SAFE_INSET = 30;
const HOOK_MAX_WIDTH = OG_WIDTH - SAFE_INSET * 2;
const PRIMARY_FONT_SIZE = 158;
const SECONDARY_FONT_SIZE = 150;
const BRAND_FONT_SIZE = 40;
const BRAND_MARK_SIZE = 24;
const CORNER_LABEL_FONT_SIZE = 36;

export interface MountedSiteOverlay {
	fit(): number;
	assert(): void;
}

const WAVE_WORD = 'TEXTMODE';
const WAVE_OFFSETS = [8, -2, -9, -4, 7, 13, 5, -4];

export function mountSiteOverlay(): MountedSiteOverlay {
	const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
	svg.id = 'og-overlay';
	svg.dataset.layout = 'site';
	svg.setAttribute('width', String(OG_WIDTH));
	svg.setAttribute('height', String(OG_HEIGHT));
	svg.setAttribute('viewBox', `0 0 ${OG_WIDTH} ${OG_HEIGHT}`);
	svg.innerHTML = `
		<g id="site-og-brand" transform="translate(${SAFE_INSET} 47)">
			<g transform="scale(${BRAND_MARK_SIZE / 768})" fill="#f2f2ec"><path d="${getBrandMarkPath()}" /></g>
			<text x="40" y="20" fill="#f2f2ec" font-family="Monogram Extended" font-size="${BRAND_FONT_SIZE}">editor.textmode.art</text>
		</g>
		<text id="site-og-top-right" x="${OG_WIDTH - SAFE_INSET}" y="66" fill="#d8d8d2" font-family="Monogram Extended" font-size="${CORNER_LABEL_FONT_SIZE}" text-anchor="end" letter-spacing="1">FREE + OPEN SOURCE</text>
		<g id="site-og-hook" fill="#f2f2ec" font-family="Monogram Extended" text-anchor="start">
			<text id="site-og-hook-primary" x="${SAFE_INSET}" y="295" font-size="${PRIMARY_FONT_SIZE}" letter-spacing="2" xml:space="preserve">CREATE </text><g id="site-og-hook-wave"><text font-size="${PRIMARY_FONT_SIZE}" font-style="italic">TEXTMODE</text></g>
			<text id="site-og-hook-secondary" x="${SAFE_INSET}" y="420" font-size="${SECONDARY_FONT_SIZE}" letter-spacing="2">IN YOUR BROWSER</text>
		</g>
		<text id="site-og-bottom-left" x="${SAFE_INSET}" y="596" fill="#d8d8d2" font-family="Monogram Extended" font-size="${CORNER_LABEL_FONT_SIZE}" letter-spacing="1">LIVE CODE / CHARACTER GRAPHICS</text>
		<text id="site-og-bottom-right" x="${OG_WIDTH - SAFE_INSET}" y="596" fill="#d8d8d2" font-family="Monogram Extended" font-size="${CORNER_LABEL_FONT_SIZE}" text-anchor="end" letter-spacing="1">BROWSER-BASED / TEXTMODE.JS</text>
	`;
	document.body.appendChild(svg);

	return {
		fit: fitSiteMetadata,
		assert: assertSiteMetadataLayout,
	};
}

function fitSiteMetadata(): number {
	const createText = getSvgText('site-og-hook-primary');
	const secondaryText = getSvgText('site-og-hook-secondary');
	const waveGroup = document.getElementById('site-og-hook-wave');
	if (!createText || !secondaryText || !waveGroup) return 0;

	createText.setAttribute('font-size', String(PRIMARY_FONT_SIZE));
	secondaryText.setAttribute('font-size', String(SECONDARY_FONT_SIZE));

	const stepAtInitialSize = 70;
	const createWidth = createText.getComputedTextLength();
	const waveWidth = WAVE_WORD.length * stepAtInitialSize;
	const totalPrimaryWidth = createWidth + waveWidth;

	const fontSize = getFittedFontSize(totalPrimaryWidth, HOOK_MAX_WIDTH, PRIMARY_FONT_SIZE, 112);
	const secondaryFontSize = getFittedFontSize(
		secondaryText.getComputedTextLength(),
		HOOK_MAX_WIDTH,
		SECONDARY_FONT_SIZE,
		112
	);

	createText.setAttribute('font-size', String(fontSize));
	secondaryText.setAttribute('font-size', String(secondaryFontSize));

	const fittedCreateWidth = createText.getComputedTextLength();
	const scale = fontSize / PRIMARY_FONT_SIZE;
	const step = stepAtInitialSize * scale;
	const startX = SAFE_INSET + fittedCreateWidth;
	const baseline = 295;

	waveGroup.replaceChildren(
		...Array.from(WAVE_WORD).map((glyph, index) => {
			const text = document.createElementNS(SVG_NAMESPACE, 'text');
			text.setAttribute('x', String(startX + index * step));
			text.setAttribute('y', String(baseline + WAVE_OFFSETS[index % WAVE_OFFSETS.length] * scale));
			text.setAttribute('fill', '#f2f2ec');
			text.setAttribute('font-family', 'Monogram Extended');
			text.setAttribute('font-size', String(fontSize));
			text.setAttribute('font-style', 'italic');
			text.textContent = glyph;
			return text;
		})
	);

	return 0;
}

function assertSiteMetadataLayout(): void {
	const brand = document.getElementById('site-og-brand');
	const topRight = getSvgText('site-og-top-right');
	const hook = document.getElementById('site-og-hook');
	const bottomLeft = getSvgText('site-og-bottom-left');
	const bottomRight = getSvgText('site-og-bottom-right');
	if (!brand || !topRight || !hook || !bottomLeft || !bottomRight) {
		throw new Error('Site OG metadata overlay is incomplete.');
	}

	const overlay = document.getElementById('og-overlay');
	const overlayText = overlay?.textContent ?? '';
	for (const expected of [
		'editor.textmode.art',
		'CREATE TEXTMODE',
		'IN YOUR BROWSER',
		'FREE + OPEN SOURCE',
		'LIVE CODE / CHARACTER GRAPHICS',
		'BROWSER-BASED / TEXTMODE.JS',
	]) {
		if (!overlayText.includes(expected)) {
			throw new Error(`Site OG metadata overlay is missing expected label "${expected}".`);
		}
	}
	if (
		overlay?.querySelectorAll('#site-og-backdrop').length !== 0 ||
		overlay?.querySelectorAll('rect, linearGradient, radialGradient, filter').length !== 0
	) {
		throw new Error('Site OG overlay must contain no backdrop and no effects.');
	}

	const elements = [
		['brand', brand],
		['top-right label', topRight],
		['hook', hook],
		['bottom-left label', bottomLeft],
		['bottom-right label', bottomRight],
	] as const;
	const tolerance = 1;

	for (const [label, element] of elements) {
		const bounds = element.getBoundingClientRect();
		if (
			bounds.left < SAFE_INSET - tolerance ||
			bounds.right > OG_WIDTH - SAFE_INSET + tolerance ||
			bounds.top < VERTICAL_SAFE_INSET - tolerance ||
			bounds.bottom > OG_HEIGHT - VERTICAL_SAFE_INSET + tolerance
		) {
			throw new Error(
				`Site OG ${label} escaped its safe area (${Math.round(bounds.left)},${Math.round(bounds.top)} ${Math.round(bounds.width)}x${Math.round(bounds.height)}).`
			);
		}
	}

	const topBottom = Math.max(brand.getBoundingClientRect().bottom, topRight.getBoundingClientRect().bottom);
	const hookBounds = hook.getBoundingClientRect();
	const bottomTop = Math.min(bottomLeft.getBoundingClientRect().top, bottomRight.getBoundingClientRect().top);
	if (hookBounds.top < topBottom + 48 - tolerance || hookBounds.bottom > bottomTop - 48 + tolerance) {
		throw new Error('Site OG hook overlaps its corner labels.');
	}
}
