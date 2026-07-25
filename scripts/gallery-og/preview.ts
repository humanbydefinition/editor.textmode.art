import { ExportPlugin } from 'textmode.export.js';
import {
	FIGFONT_REQUIRED_CODEPOINTS,
	FigFontParser,
	FigLayoutEngine,
	FigSmushRules,
	FigletPlugin,
	TextmodeFigFont,
} from 'textmode.figlet.js';
import { FiltersPlugin, createFiltersPlugin } from 'textmode.filters.js';
import {
	EASING_FUNCTIONS,
	SynthPlugin,
	SynthSource,
	cellColor,
	char,
	charColor,
	gradient,
	moire,
	noise,
	osc,
	paint,
	plasma,
	setGlobalErrorCallback,
	shape,
	solid,
	src,
	voronoi,
} from 'textmode.synth.js';
import {
	textmode,
	type Textmodifier,
	type TextmodeLayer,
	type TextmodeLayerManager,
	type TextmodePlugin,
} from 'textmode.js';
import {
	escapeMarkup,
	getFittedFontSize,
	OG_HEIGHT,
	OG_WIDTH,
	type GalleryOgLayout,
	type OgCaptureResult,
	type OgLayout,
	type OgPreviewRequest,
} from './contracts';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const BRAND_MARK_PATH =
	'M288 288H192V192H96V96H0V0H192V96H288V192H384V288H480V384H384V480H288V576H192V672H0V576H96V480H192V384H288ZM384 576H768V672H384Z';
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
const SITE_SAFE_INSET = 48;
const SITE_VERTICAL_SAFE_INSET = 30;
const SITE_HOOK_MAX_WIDTH = OG_WIDTH - SITE_SAFE_INSET * 2;
const SITE_PRIMARY_FONT_SIZE = 158;
const SITE_SECONDARY_FONT_SIZE = 150;
const SITE_BRAND_FONT_SIZE = 40;
const SITE_BRAND_MARK_SIZE = 24;
const SITE_CORNER_LABEL_FONT_SIZE = 36;

declare global {
	interface Window {
		renderOg(request: OgPreviewRequest): Promise<OgCaptureResult>;
	}
}

window.renderOg = async (request) => {
	document.body.dataset.status = 'running';
	delete document.body.dataset.error;
	document.querySelectorAll('canvas, #og-overlay').forEach((element) => element.remove());

	let runtimeError: Error | null = null;
	const disposers: Array<() => void> = [];
	const markError = (error: unknown): void => {
		const normalized = error instanceof Error ? error : new Error(String(error));
		runtimeError ??= normalized;
		document.body.dataset.status = 'error';
		document.body.dataset.error = normalized.message;
	};
	const handleWindowError = (event: ErrorEvent): void => markError(event.error ?? event.message);
	const handleUnhandledRejection = (event: PromiseRejectionEvent): void => markError(event.reason);
	window.addEventListener('error', handleWindowError);
	window.addEventListener('unhandledrejection', handleUnhandledRejection);

	setGlobalErrorCallback((error) => markError(error));
	let instance: Textmodifier;
	try {
		instance = textmode.create({
			width: OG_WIDTH,
			height: OG_HEIGHT,
			fontSize: 16,
			frameRate: 60,
			plugins: [
				ExportPlugin,
				SynthPlugin,
				FiltersPlugin as unknown as TextmodePlugin,
				FigletPlugin as unknown as TextmodePlugin,
			],
		});
	} catch (error) {
		markError(error);
		throw error;
	}
	instance.noLoop();
	instance.canvas.dataset.galleryOgCanvas = 'true';
	document.body.appendChild(instance.canvas);

	const runtime = createSafeTextmodeRuntime(instance, markError);
	const safeInstance = runtime.proxy;
	const silentFft = new Uint8Array(512);
	const silentWaveform = new Uint8Array(1024);
	silentWaveform.fill(128);
	const audio = {
		fft: () => new Uint8Array(silentFft),
		waveform: () => new Uint8Array(silentWaveform),
		bass: () => 0,
		mid: () => 0,
		high: () => 0,
		volume: () => 0,
		timestamp: () => 0,
		hasData: () => false,
	};
	const globals = {
		t: safeInstance,
		audio,
		onDispose: (callback: unknown) => {
			if (typeof callback !== 'function') throw new TypeError('onDispose expects a function');
			disposers.push(callback as () => void);
		},
		src,
		osc,
		noise,
		plasma,
		moire,
		gradient,
		solid,
		shape,
		voronoi,
		charColor,
		cellColor,
		paint,
		char,
		SynthPlugin,
		FiltersPlugin,
		ExportPlugin,
		FigletPlugin,
		createFiltersPlugin,
		SynthSource,
		TextmodeFigFont,
		FigFontParser,
		FigLayoutEngine,
		FigSmushRules,
		FIGFONT_REQUIRED_CODEPOINTS,
		EASING_FUNCTIONS,
		setGlobalErrorCallback,
	};

	try {
		const keys = Object.keys(globals);
		const values = Object.values(globals);
		const execute = new Function(...keys, `"use strict";\nreturn (async () => {\n${request.code}\n})();`);
		try {
			await withTimeout(
				Promise.resolve(execute(...values)),
				10_000,
				'Timed out while evaluating top-level sketch code.'
			);
		} finally {
			runtime.finishCodeEvaluation();
		}
		await withTimeout(runtime.setupComplete, 10_000, 'Timed out while running sketch setup.');
		await waitFor(() => instance.frameCount >= 1 || runtimeError !== null, 10_000);
		if (runtimeError) throw runtimeError;

		instance.noLoop();
		instance.exportOverlay.hide();
		const remainingFrames = request.frame - instance.frameCount;
		if (remainingFrames < 0) {
			throw new Error(
				`Preview rendered past requested frame ${request.frame} before capture (${instance.frameCount}).`
			);
		}
		if (remainingFrames > 0) instance.redraw(remainingFrames);

		await waitFor(() => instance.frameCount >= request.frame || runtimeError !== null, 10_000);
		if (runtimeError) throw runtimeError;
		if (instance.frameCount !== request.frame) {
			throw new Error(`Preview rendered frame ${instance.frameCount}; expected ${request.frame}.`);
		}
		instance.noLoop();
		buildOverlay(request.layout);
		await document.fonts.ready;
		const descriptionLines = request.layout.kind === 'gallery' ? fitGalleryMetadata() : fitSiteMetadata();
		await nextPaint();
		assertOverlayLayout(request.layout.kind);

		document.body.dataset.status = 'ready';
		return {
			frame: instance.frameCount,
			seconds: runtime.capturedSeconds() ?? getFrameSeconds(instance),
			descriptionLines,
			layout: request.layout.kind,
		};
	} catch (error) {
		markError(error);
		throw error;
	} finally {
		window.addEventListener(
			'pagehide',
			() => {
				for (const dispose of disposers) dispose();
				instance.destroy();
				setGlobalErrorCallback(null);
				window.removeEventListener('error', handleWindowError);
				window.removeEventListener('unhandledrejection', handleUnhandledRejection);
			},
			{ once: true }
		);
	}
};

interface SafeTextmodeRuntime {
	proxy: Textmodifier;
	setupComplete: Promise<void>;
	finishCodeEvaluation(): void;
	capturedSeconds(): number | null;
}

function createSafeTextmodeRuntime(instance: Textmodifier, onError: (error: unknown) => void): SafeTextmodeRuntime {
	let observedCaptureSeconds: number | null = null;
	let userSetup: (() => void | Promise<void>) | undefined;
	let finishCodeEvaluation!: () => void;
	let resolveSetup!: () => void;
	let rejectSetup!: (error: unknown) => void;
	const codeEvaluationComplete = new Promise<void>((resolve) => {
		finishCodeEvaluation = resolve;
	});
	const setupComplete = new Promise<void>((resolve, reject) => {
		resolveSetup = resolve;
		rejectSetup = reject;
	});

	void instance.setup(async () => {
		await codeEvaluationComplete;
		try {
			await userSetup?.();
			resolveSetup();
		} catch (error) {
			onError(error);
			rejectSetup(error);
			throw error;
		}
	});

	const wrapCallback = (callback: () => void) => () => {
		try {
			instance.secs = getFrameSeconds(instance);
			observedCaptureSeconds = instance.secs;
			callback();
		} catch (error) {
			onError(error);
		}
	};
	const wrapLayer = (layer: TextmodeLayer): TextmodeLayer =>
		new Proxy(layer, {
			get(target, property) {
				const value = Reflect.get(target, property, target) as unknown;
				if (property === 'draw' || property === 'postDraw') {
					return (callback: () => void) => target[property](wrapCallback(callback));
				}
				return typeof value === 'function' ? value.bind(target) : value;
			},
		});
	const wrapLayers = (layers: TextmodeLayerManager): TextmodeLayerManager =>
		new Proxy(layers, {
			get(target, property) {
				const value = Reflect.get(target, property, target) as unknown;
				if (property === 'base') return wrapLayer(target.base);
				if (property === 'add') {
					return (options?: Parameters<TextmodeLayerManager['add']>[0]) => wrapLayer(target.add(options));
				}
				if (property === 'all') return target.all.map(wrapLayer);
				return typeof value === 'function' ? value.bind(target) : value;
			},
		});

	const proxy = new Proxy(instance, {
		get(target, property) {
			const value = Reflect.get(target, property, target) as unknown;
			if (property === 'setup') {
				return (callback: () => void | Promise<void>) => {
					if (typeof callback !== 'function') throw new TypeError('t.setup expects a function');
					userSetup = callback;
					return Promise.resolve();
				};
			}
			if (property === 'draw' || property === 'postDraw' || property === 'finalDraw') {
				return (callback: () => void) => target[property](wrapCallback(callback));
			}
			if (property === 'layers') return wrapLayers(target.layers);
			return typeof value === 'function' ? value.bind(target) : value;
		},
	});

	return {
		proxy,
		setupComplete,
		finishCodeEvaluation,
		capturedSeconds: () => observedCaptureSeconds,
	};
}

function getFrameSeconds(instance: Textmodifier): number {
	const targetFrameRate = instance.targetFrameRate();
	const framesPerSecond = typeof targetFrameRate === 'number' && targetFrameRate > 0 ? targetFrameRate : 60;
	return Math.max(0, instance.frameCount - 1) / framesPerSecond;
}

function buildOverlay(layout: OgLayout): void {
	const svg = layout.kind === 'gallery' ? buildGalleryOverlay(layout) : buildSiteOverlay();
	document.body.appendChild(svg);
}

function buildGalleryOverlay(layout: GalleryOgLayout): SVGSVGElement {
	const displayAuthorName = layout.authorName?.trim() || 'anonymous';
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
		<g transform="translate(48 49) scale(${20 / 768})" fill="#f2f2ec"><path d="${BRAND_MARK_PATH}" /></g>
		<text x="82" y="67" fill="#f2f2ec" font-family="Monogram Extended" font-size="36">editor.textmode.art</text>
		<text x="1152" y="67" fill="#d8d8d2" font-family="Monogram Extended" font-size="28" text-anchor="end" letter-spacing="1">GALLERY SKETCH</text>
		<text id="gallery-og-title" x="${METADATA_LEFT}" y="0" fill="#f2f2ec" font-family="Monogram Extended" font-size="${TITLE_FONT_SIZE}" font-style="italic">${escapeMarkup(layout.title)}</text>
		<text id="gallery-og-description" x="${METADATA_LEFT}" y="0" fill="#b8b8b2" font-family="Monogram Extended" font-size="${DESCRIPTION_FONT_SIZE}">${escapeMarkup(layout.description?.trim() ?? '')}</text>
		<text id="gallery-og-author" x="${METADATA_LEFT}" y="0" fill="#8e8e88" font-family="Monogram Extended" font-size="${AUTHOR_FONT_SIZE}" letter-spacing="1"><tspan>by </tspan><tspan id="gallery-og-author-name" fill="#d8d8d2" font-style="italic">${escapeMarkup(displayAuthorName)}</tspan></text>
	`;
	return svg;
}

function buildSiteOverlay(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
	svg.id = 'og-overlay';
	svg.dataset.layout = 'site';
	svg.setAttribute('width', String(OG_WIDTH));
	svg.setAttribute('height', String(OG_HEIGHT));
	svg.setAttribute('viewBox', `0 0 ${OG_WIDTH} ${OG_HEIGHT}`);
	svg.innerHTML = `
		<rect id="site-og-backdrop" width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#000" opacity="0.45" />
		<g id="site-og-brand" transform="translate(${SITE_SAFE_INSET} 47)">
			<g transform="scale(${SITE_BRAND_MARK_SIZE / 768})" fill="#f2f2ec"><path d="${BRAND_MARK_PATH}" /></g>
			<text x="40" y="20" fill="#f2f2ec" font-family="Monogram Extended" font-size="${SITE_BRAND_FONT_SIZE}">editor.textmode.art</text>
		</g>
		<text id="site-og-top-right" x="${OG_WIDTH - SITE_SAFE_INSET}" y="66" fill="#d8d8d2" font-family="Monogram Extended" font-size="${SITE_CORNER_LABEL_FONT_SIZE}" text-anchor="end" letter-spacing="1">FREE + OPEN SOURCE</text>
		<g id="site-og-hook" fill="#f2f2ec" font-family="Monogram Extended" text-anchor="start">
			<text id="site-og-hook-primary" x="${SITE_SAFE_INSET}" y="295" font-size="${SITE_PRIMARY_FONT_SIZE}" letter-spacing="2"><tspan>CREATE </tspan><tspan font-style="italic" letter-spacing="0">TEXTMODE</tspan></text>
			<text id="site-og-hook-secondary" x="${SITE_SAFE_INSET}" y="420" font-size="${SITE_SECONDARY_FONT_SIZE}" letter-spacing="2">IN YOUR BROWSER</text>
		</g>
		<text id="site-og-bottom-left" x="${SITE_SAFE_INSET}" y="596" fill="#d8d8d2" font-family="Monogram Extended" font-size="${SITE_CORNER_LABEL_FONT_SIZE}" letter-spacing="1">LIVE CODING / ASCII + TEXTMODE</text>
		<text id="site-og-bottom-right" x="${OG_WIDTH - SITE_SAFE_INSET}" y="596" fill="#d8d8d2" font-family="Monogram Extended" font-size="${SITE_CORNER_LABEL_FONT_SIZE}" text-anchor="end" letter-spacing="1">BROWSER-BASED / TEXTMODE.JS</text>
	`;
	return svg;
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

function fitSiteMetadata(): number {
	const primary = getSvgText('site-og-hook-primary');
	const secondary = getSvgText('site-og-hook-secondary');
	if (!primary || !secondary) return 0;

	fitSvgTextPreservingChildren(primary, SITE_HOOK_MAX_WIDTH, SITE_PRIMARY_FONT_SIZE, 112);
	fitSvgTextPreservingChildren(secondary, SITE_HOOK_MAX_WIDTH, SITE_SECONDARY_FONT_SIZE, 112);

	return 0;
}

function fitSvgTextPreservingChildren(
	text: SVGTextElement,
	maxWidth: number,
	initialFontSize: number,
	minimumFontSize: number
): void {
	const fontSize = getFittedFontSize(text.getComputedTextLength(), maxWidth, initialFontSize, minimumFontSize);
	text.setAttribute('font-size', String(fontSize));
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

function fitSvgText(text: SVGTextElement, maxWidth: number, initialFontSize: number, minimumFontSize: number): void {
	const fontSize = getFittedFontSize(text.getComputedTextLength(), maxWidth, initialFontSize, minimumFontSize);
	text.setAttribute('font-size', String(fontSize));
	while (text.getComputedTextLength() > maxWidth && (text.textContent?.length ?? 0) > 1) {
		text.textContent = `${text.textContent?.slice(0, -2)}…`;
	}
}

function wrapSvgText(text: SVGTextElement, value: string, maxWidth: number, fontSize: number): number {
	text.removeAttribute('transform');
	text.setAttribute('font-size', String(fontSize));
	text.replaceChildren();
	const remainingLines: string[] = [];
	let remaining = value.replace(/\s+/g, ' ').trim();

	while (remaining) {
		if (measureSvgText(text, remaining) <= maxWidth) {
			remainingLines.push(remaining);
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
		remainingLines.push(remaining.slice(0, breakAt).trimEnd());
		remaining = remaining.slice(breakAt).trimStart();
	}

	renderSvgTextLines(text, remainingLines, fontSize);
	return remainingLines.length;
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

function measureSvgText(text: SVGTextElement, value: string): number {
	text.textContent = value;
	return text.getComputedTextLength();
}

function placeSvgTextBottom(text: SVGTextElement, bottom: number): number {
	const bounds = text.getBBox();
	const offsetY = bottom - (bounds.y + bounds.height);
	text.setAttribute('transform', `translate(0 ${offsetY})`);
	return bounds.y + offsetY;
}

function getSvgText(id: string): SVGTextElement | null {
	const element = document.getElementById(id);
	return element instanceof SVGTextElement ? element : null;
}

function assertOverlayLayout(layout: 'gallery' | 'site'): void {
	if (layout === 'gallery') {
		assertGalleryMetadataLayout();
		return;
	}
	assertSiteMetadataLayout();
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

function assertSiteMetadataLayout(): void {
	const brand = document.getElementById('site-og-brand');
	const topRight = getSvgText('site-og-top-right');
	const hook = document.getElementById('site-og-hook');
	const bottomLeft = getSvgText('site-og-bottom-left');
	const bottomRight = getSvgText('site-og-bottom-right');
	if (!brand || !topRight || !hook || !bottomLeft || !bottomRight) {
		throw new Error('Site OG metadata overlay is incomplete.');
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
			bounds.left < SITE_SAFE_INSET - tolerance ||
			bounds.right > OG_WIDTH - SITE_SAFE_INSET + tolerance ||
			bounds.top < SITE_VERTICAL_SAFE_INSET - tolerance ||
			bounds.bottom > OG_HEIGHT - SITE_VERTICAL_SAFE_INSET + tolerance
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

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
	const startedAt = performance.now();
	while (!predicate()) {
		if (performance.now() - startedAt > timeoutMs)
			throw new Error('Timed out waiting for the requested sketch frame.');
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}
}

function nextPaint(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
	let timeoutId = 0;
	const timeout = new Promise<never>((_, reject) => {
		timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		window.clearTimeout(timeoutId);
	}
}
