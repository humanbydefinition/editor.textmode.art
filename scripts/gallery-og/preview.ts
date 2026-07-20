import { ExportPlugin, createTextmodeExportPlugin } from 'textmode.export.js';
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
import { escapeXml, formatOgAuthor, getFittedFontSize, OG_HEIGHT, OG_WIDTH } from './contracts';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const BRAND_MARK_PATH =
	'M512 128H256V256H512V384H640V256H512ZM256 384H128V512H256V640H512V512H256ZM128 128V0H640V128H768V640H640V768H128V640H0V128Z';

interface PreviewRequest {
	code: string;
	frame: number;
	title: string;
	description: string | null;
	authorName: string | null;
}

interface PreviewResult {
	frame: number;
	seconds: number;
}

declare global {
	interface Window {
		renderGalleryOg(request: PreviewRequest): Promise<PreviewResult>;
	}
}

window.renderGalleryOg = async (request) => {
	document.body.dataset.status = 'running';
	delete document.body.dataset.error;
	document.querySelectorAll('canvas, #gallery-og-overlay').forEach((element) => element.remove());

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
			plugins: [ExportPlugin, SynthPlugin, FiltersPlugin, FigletPlugin as unknown as TextmodePlugin],
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
		createTextmodeExportPlugin,
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
		const targetFrameRate = instance.targetFrameRate();
		const framesPerSecond = typeof targetFrameRate === 'number' && targetFrameRate > 0 ? targetFrameRate : 60;
		instance.frameCount = request.frame - 1;
		const targetSeconds = (request.frame - 1) / framesPerSecond;
		instance.secs = targetSeconds;
		runtime.armCapture(targetSeconds);
		instance.redraw(1);

		await waitFor(() => instance.frameCount >= request.frame || runtimeError !== null, 10_000);
		if (runtimeError) throw runtimeError;
		instance.noLoop();
		buildOverlay(request.title, request.description, request.authorName);
		await document.fonts.ready;
		fitMetadata();
		await nextPaint();

		document.body.dataset.status = 'ready';
		return { frame: instance.frameCount, seconds: runtime.capturedSeconds() ?? targetSeconds };
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
	armCapture(seconds: number): void;
	capturedSeconds(): number | null;
}

function createSafeTextmodeRuntime(instance: Textmodifier, onError: (error: unknown) => void): SafeTextmodeRuntime {
	let captureArmed = false;
	let targetCaptureSeconds = 0;
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
		if (!captureArmed) return;
		try {
			instance.secs = targetCaptureSeconds;
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
		armCapture: (seconds) => {
			targetCaptureSeconds = seconds;
			captureArmed = true;
		},
		capturedSeconds: () => observedCaptureSeconds,
	};
}

function buildOverlay(title: string, description: string | null, authorName: string | null): void {
	const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
	svg.id = 'gallery-og-overlay';
	svg.setAttribute('width', String(OG_WIDTH));
	svg.setAttribute('height', String(OG_HEIGHT));
	svg.setAttribute('viewBox', `0 0 ${OG_WIDTH} ${OG_HEIGHT}`);
	svg.innerHTML = `
		<defs>
			<linearGradient id="top-scrim" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#000" stop-opacity="0.76" />
				<stop offset="1" stop-color="#000" stop-opacity="0" />
			</linearGradient>
		</defs>
		<rect width="1200" height="150" fill="url(#top-scrim)" />
		<g transform="translate(48 49) scale(${20 / 768})" fill="#f2f2ec"><path d="${BRAND_MARK_PATH}" /></g>
		<text x="82" y="67" fill="#f2f2ec" font-family="Monogram Extended" font-size="36">editor.textmode.art</text>
		<text x="1152" y="67" fill="#d8d8d2" font-family="Monogram Extended" font-size="28" text-anchor="end" letter-spacing="1">GALLERY SKETCH</text>
		<text id="gallery-og-title" x="48" y="342" fill="#f2f2ec" font-family="Monogram Extended" font-size="96" font-style="italic">${escapeXml(title)}</text>
		<text id="gallery-og-description" x="48" y="394" fill="#f2f2ec" font-family="Monogram Extended" font-size="44">${escapeXml(description?.trim() ?? '')}</text>
		<text id="gallery-og-author" x="48" y="434" fill="#d8d8d2" font-family="Monogram Extended" font-size="32" letter-spacing="1">${escapeXml(formatOgAuthor(authorName))}</text>
	`;
	document.body.appendChild(svg);
}

function fitMetadata(): void {
	fitSvgText('gallery-og-title', 1104, 96, 48);
	fitSvgText('gallery-og-description', 1104, 44, 24);
	fitSvgText('gallery-og-author', 1104, 32, 20);
}

function fitSvgText(id: string, maxWidth: number, initialFontSize: number, minimumFontSize: number): void {
	const text = document.getElementById(id);
	if (!(text instanceof SVGTextElement)) return;
	const fontSize = getFittedFontSize(text.getComputedTextLength(), maxWidth, initialFontSize, minimumFontSize);
	text.setAttribute('font-size', String(fontSize));
	while (text.getComputedTextLength() > maxWidth && (text.textContent?.length ?? 0) > 1) {
		text.textContent = `${text.textContent?.slice(0, -2)}…`;
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
