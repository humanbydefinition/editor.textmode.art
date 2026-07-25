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
import { OG_HEIGHT, OG_WIDTH } from '../config';

export interface RenderedSketch {
	frame: number;
	seconds: number;
	dispose(): void;
}

export async function renderSketchAtFrame(
	code: string,
	requestedFrame: number,
	onError: (error: unknown) => void
): Promise<RenderedSketch> {
	let runtimeError: Error | null = null;
	let disposed = false;
	const disposers: Array<() => void> = [];
	const markError = (error: unknown): void => {
		const normalized = error instanceof Error ? error : new Error(String(error));
		runtimeError ??= normalized;
		onError(normalized);
	};
	const handleWindowError = (event: ErrorEvent): void => markError(event.error ?? event.message);
	const handleUnhandledRejection = (event: PromiseRejectionEvent): void => markError(event.reason);
	window.addEventListener('error', handleWindowError);
	window.addEventListener('unhandledrejection', handleUnhandledRejection);
	setGlobalErrorCallback(markError);

	let instance: Textmodifier | undefined;
	const dispose = (): void => {
		if (disposed) return;
		disposed = true;
		for (const callback of disposers) {
			try {
				callback();
			} catch {
				// Disposal must continue so browser and WebGL resources are always released.
			}
		}
		instance?.destroy();
		setGlobalErrorCallback(null);
		window.removeEventListener('error', handleWindowError);
		window.removeEventListener('unhandledrejection', handleUnhandledRejection);
	};

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

		const keys = Object.keys(globals);
		const values = Object.values(globals);
		const execute = new Function(...keys, `"use strict";\nreturn (async () => {\n${code}\n})();`);
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
		await waitFor(() => (instance?.frameCount ?? 0) >= 1 || runtimeError !== null, 10_000);
		if (runtimeError) throw runtimeError;

		instance.noLoop();
		instance.exportOverlay.hide();
		const remainingFrames = requestedFrame - instance.frameCount;
		if (remainingFrames < 0) {
			throw new Error(
				`Preview rendered past requested frame ${requestedFrame} before capture (${instance.frameCount}).`
			);
		}
		if (remainingFrames > 0) instance.redraw(remainingFrames);

		await waitFor(() => (instance?.frameCount ?? 0) >= requestedFrame || runtimeError !== null, 10_000);
		if (runtimeError) throw runtimeError;
		if (instance.frameCount !== requestedFrame) {
			throw new Error(`Preview rendered frame ${instance.frameCount}; expected ${requestedFrame}.`);
		}
		instance.noLoop();

		return {
			frame: instance.frameCount,
			seconds: runtime.capturedSeconds() ?? getFrameSeconds(instance),
			dispose,
		};
	} catch (error) {
		markError(error);
		dispose();
		throw error;
	}
}

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

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
	const startedAt = performance.now();
	while (!predicate()) {
		if (performance.now() - startedAt > timeoutMs) {
			throw new Error('Timed out waiting for the requested sketch frame.');
		}
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}
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
