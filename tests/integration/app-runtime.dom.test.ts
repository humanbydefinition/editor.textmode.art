import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AppRuntime } from '../../src/app/runtime/AppRuntime';
import { makeGallerySketch } from '../support/gallery-fixtures';
import { createMemoryStorage } from '../support/memory-storage';
import { ShareService } from '../../src/features/share/model/ShareService';
import type { SharePayload } from '../../src/features/share/model/sharePayload';
import { useAppStore } from '../../src/platform/state/appStore';

const { engineInstances, getGallerySketchBySlug, getRandomGallerySketch } = vi.hoisted(() => ({
	engineInstances: [] as FakeTextmodeEngine[],
	getGallerySketchBySlug: vi.fn(),
	getRandomGallerySketch: vi.fn(),
}));

vi.mock('@/features/gallery-sketches/model/catalog', () => ({
	getGallerySketchBySlug,
	getRandomGallerySketch,
}));

vi.mock('@/textmode/TextmodeEngine', () => {
	class TextmodeEngine {
		private initialized = false;

		initialCode = '';
		code = '';
		init = vi.fn((context?: FakeEngineContext) => {
			this.initialCode = context?.getInitialCode() ?? '';
			this.initialized = true;
		});
		dispose = vi.fn(() => {
			this.initialized = false;
		});
		isInitialized = vi.fn(() => this.initialized);
		getCode = vi.fn(() => this.code);
		setCode = vi.fn();
		setReadOnly = vi.fn();
		sendAudioData = vi.fn();
		replaceAndRun = vi.fn();
		tryReplaceAndRun = vi.fn(async () => true);
		reloadSandbox = vi.fn();
		updateSettings = vi.fn();
		focus = vi.fn();

		constructor() {
			engineInstances.push(this);
		}
	}

	return { TextmodeEngine };
});

const runtimes: AppRuntime[] = [];

describe('AppRuntime', () => {
	beforeEach(() => {
		engineInstances.length = 0;
		getGallerySketchBySlug.mockReset();
		getRandomGallerySketch.mockReset();
		vi.stubGlobal('localStorage', createMemoryStorage());
		window.history.replaceState(null, '', '/');
	});

	afterEach(() => {
		for (const runtime of runtimes.splice(0)) {
			runtime.dispose();
		}
		vi.unstubAllGlobals();
	});

	it.each([
		['container first', (runtime: AppRuntime, container: HTMLElement) => runtime.layout.onTextmodeReady(container)],
		['initialization first', (runtime: AppRuntime) => runtime.init()],
	])('initializes once when both prerequisites arrive: %s', (_label, arrangeFirst) => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const container = document.createElement('div');

		arrangeFirst(runtime, container);
		if (engine.init.mock.calls.length === 0) {
			if (_label === 'container first') runtime.init();
			else runtime.layout.onTextmodeReady(container);
		}

		expect(engine.init).toHaveBeenCalledOnce();
		expect(engine.init).toHaveBeenCalledWith(expect.objectContaining({ editorContainer: container }));

		runtime.init();
		runtime.layout.onTextmodeReady(container);
		expect(engine.init).toHaveBeenCalledOnce();
	});

	it('initializes exactly once per dispose and restart lifecycle', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();

		runtime.init();
		runtime.layout.onTextmodeReady(document.createElement('div'));
		runtime.dispose();
		runtime.init();
		runtime.layout.onTextmodeReady(document.createElement('div'));

		expect(engine.init).toHaveBeenCalledTimes(2);
		expect(engine.dispose).toHaveBeenCalledOnce();
	});

	it('loads gallery code through an in-place runtime reset', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const sketch = makeGallerySketch({ slug: 'textmodeshift', title: 'TEXTMODESHIFT' });
		engine.init();
		getRandomGallerySketch.mockReturnValue(sketch);

		expect(runtime.actions.randomize()).toBe(true);
		expect(engine.replaceAndRun).toHaveBeenCalledWith(sketch.textmodeCode, 'reset-runtime');
		expect(engine.reloadSandbox).not.toHaveBeenCalled();
	});

	it('loads saved local code on the main route without selecting a gallery sketch', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		localStorage.setItem('textmode_code', 'saved local code');

		initialize(runtime);

		expect(getInitialCode(engine)).toBe('saved local code');
		expect(getRandomGallerySketch).not.toHaveBeenCalled();
		expect(window.location.pathname).toBe('/');
	});

	it('loads a random gallery sketch when the main route has no local code', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const sketch = makeGallerySketch({ slug: 'textmodeshift' });
		getRandomGallerySketch.mockReturnValue(sketch);

		initialize(runtime);

		expect(getInitialCode(engine)).toBe(sketch.textmodeCode);
		expect(getRandomGallerySketch).toHaveBeenCalledOnce();
		expect(window.location.pathname).toBe('/s/textmodeshift/');
	});

	it('prefers an explicit gallery route over saved local code', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const sketch = makeGallerySketch({ slug: 'textmodeshift' });
		localStorage.setItem('textmode_code', 'saved local code');
		getGallerySketchBySlug.mockReturnValue(sketch);
		window.history.replaceState(null, '', '/s/textmodeshift/');

		initialize(runtime);

		expect(engine.initialCode).toBe(sketch.textmodeCode);
		expect(engine.replaceAndRun).not.toHaveBeenCalled();
		expect(getRandomGallerySketch).not.toHaveBeenCalled();
	});

	it('prefers a shared sketch over local code and random gallery selection', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const payload: SharePayload = {
			v: 1,
			createdAt: 0,
			engines: { textmode: 'shared code' },
		};
		localStorage.setItem('textmode_code', 'saved local code');
		window.history.replaceState(null, '', `/#share=${ShareService.encode(payload)}`);

		initialize(runtime);

		expect(getInitialCode(engine)).toBe('shared code');
		expect(getGallerySketchBySlug).not.toHaveBeenCalled();
		expect(getRandomGallerySketch).not.toHaveBeenCalled();
	});

	it('normalizes an unknown path before applying the main-route fallback', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const sketch = makeGallerySketch({ slug: 'textmodetower' });
		getRandomGallerySketch.mockReturnValue(sketch);
		window.history.replaceState(null, '', '/unknown');

		initialize(runtime);

		expect(getInitialCode(engine)).toBe(sketch.textmodeCode);
		expect(window.location.pathname).toBe('/s/textmodetower/');
	});

	it('restores saved local code from an active gallery sketch without rewriting storage', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const sketch = makeGallerySketch({ slug: 'textmodeshift' });
		localStorage.setItem('textmode_code', 'saved local code');
		getRandomGallerySketch.mockReturnValue(sketch);
		initialize(runtime);

		expect(runtime.actions.randomize()).toBe(true);
		engine.replaceAndRun.mockClear();

		expect(runtime.actions.hasLocalSketch()).toBe(true);
		expect(runtime.actions.restoreLocalSketch()).toBe(true);
		expect(engine.replaceAndRun).toHaveBeenCalledOnce();
		expect(engine.replaceAndRun).toHaveBeenCalledWith('saved local code', 'reset-runtime');
		expect(localStorage.getItem('textmode_code')).toBe('saved local code');
		expect(window.location.pathname).toBe('/');
		expect(runtime.actions.restoreLocalSketch()).toBe(false);
	});

	it('does not restore when local code is missing or no gallery sketch is active', () => {
		const withoutLocal = track(new AppRuntime());
		const withoutLocalEngine = getEngine();
		getRandomGallerySketch.mockReturnValue(makeGallerySketch());
		initialize(withoutLocal);

		expect(withoutLocal.actions.hasLocalSketch()).toBe(false);
		expect(withoutLocal.actions.restoreLocalSketch()).toBe(false);
		expect(withoutLocalEngine.replaceAndRun).not.toHaveBeenCalled();

		withoutLocal.dispose();
		localStorage.setItem('textmode_code', 'saved local code');
		window.history.replaceState(null, '', '/');
		const withoutGallery = track(new AppRuntime());
		const withoutGalleryEngine = getEngine();
		initialize(withoutGallery);

		expect(withoutGallery.actions.restoreLocalSketch()).toBe(false);
		expect(withoutGalleryEngine.replaceAndRun).not.toHaveBeenCalled();
	});

	it('treats an edited gallery sketch as the new local state', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const sketch = makeGallerySketch();
		localStorage.setItem('textmode_code', 'previous local code');
		getRandomGallerySketch.mockReturnValue(sketch);
		initialize(runtime);
		runtime.actions.randomize();

		const context = getEngineContext(engine);
		context.onCodeChanged('edited gallery code');
		context.callbacks.onSaveCode('edited gallery code');

		expect(localStorage.getItem('textmode_code')).toBe('edited gallery code');
		expect(runtime.actions.restoreLocalSketch()).toBe(false);
	});

	it('loads a random gallery sketch when discarding a share without local code', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const gallerySketch = makeGallerySketch({ slug: 'textmodearray' });
		const payload: SharePayload = {
			v: 1,
			createdAt: 0,
			engines: { textmode: 'shared code' },
		};
		getRandomGallerySketch.mockReturnValue(gallerySketch);
		window.history.replaceState(null, '', `/#share=${ShareService.encode(payload)}`);
		initialize(runtime);

		runtime.actions.discardShare();

		expect(engine.replaceAndRun).toHaveBeenCalledWith(gallerySketch.textmodeCode, 'reset-runtime');
		expect(window.location.pathname).toBe('/s/textmodearray/');
	});

	it('clears gallery ownership only after a randomized candidate is accepted', async () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		const sketch = makeGallerySketch({ slug: 'textmodeshift', textmodeCode: "const color = '#000000';" });
		getRandomGallerySketch.mockReturnValue(sketch);
		initialize(runtime);
		engine.code = sketch.textmodeCode;
		engine.tryReplaceAndRun.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

		await expect(runtime.actions.makeRandomChange()).resolves.toBe(false);
		expect(useAppStore.getState().gallerySketch?.slug).toBe('textmodeshift');

		await expect(runtime.actions.makeRandomChange()).resolves.toBe(true);
		expect(useAppStore.getState().gallerySketch).toBeNull();
		expect(engine.tryReplaceAndRun).toHaveBeenCalledTimes(2);
		for (const [candidate] of engine.tryReplaceAndRun.mock.calls) {
			expect(candidate).toMatch(/^const color = '#[0-9a-f]{6}';$/);
			expect(candidate).not.toBe(sketch.textmodeCode);
		}
		expect(engine.replaceAndRun).not.toHaveBeenCalledWith(expect.stringContaining('const color'), 'run');
	});
});

function track(runtime: AppRuntime): AppRuntime {
	runtimes.push(runtime);
	return runtime;
}

function getEngine(): FakeTextmodeEngine {
	const engine = engineInstances.at(-1);
	if (!engine) throw new Error('Expected AppRuntime to create a TextmodeEngine');
	return engine;
}

function initialize(runtime: AppRuntime): void {
	runtime.init();
	runtime.layout.onTextmodeReady(document.createElement('div'));
}

function getEngineContext(engine: FakeTextmodeEngine): FakeEngineContext {
	const context = engine.init.mock.calls.at(-1)?.[0];
	if (!context) throw new Error('Expected the engine to receive its context');
	return context;
}

function getInitialCode(engine: FakeTextmodeEngine): string {
	return getEngineContext(engine).getInitialCode();
}

interface FakeEngineContext {
	getInitialCode(): string;
	onCodeChanged(code: string): void;
	callbacks: {
		onSaveCode(code: string): void;
	};
}

interface FakeTextmodeEngine {
	init: Mock<(context?: FakeEngineContext) => void>;
	initialCode: string;
	code: string;
	dispose: Mock<() => void>;
	isInitialized: Mock<() => boolean>;
	replaceAndRun: Mock<(code: string, reason?: string) => void>;
	tryReplaceAndRun: Mock<(code: string) => Promise<boolean>>;
	reloadSandbox: Mock<() => void>;
}
