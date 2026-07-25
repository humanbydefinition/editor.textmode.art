import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AppRuntime } from '../../src/app/runtime/AppRuntime';
import { makeGallerySketch } from '../support/gallery-fixtures';
import { createMemoryStorage } from '../support/memory-storage';

const { engineInstances, getRandomGallerySketch } = vi.hoisted(() => ({
	engineInstances: [] as FakeTextmodeEngine[],
	getRandomGallerySketch: vi.fn(),
}));

vi.mock('@/features/gallery-sketches/model/catalog', () => ({ getRandomGallerySketch }));

vi.mock('@/textmode/TextmodeEngine', () => {
	class TextmodeEngine {
		private initialized = false;

		init = vi.fn(() => {
			this.initialized = true;
		});
		dispose = vi.fn(() => {
			this.initialized = false;
		});
		isInitialized = vi.fn(() => this.initialized);
		getCode = vi.fn(() => '');
		setCode = vi.fn();
		setReadOnly = vi.fn();
		sendAudioData = vi.fn();
		replaceAndRun = vi.fn();
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
		getRandomGallerySketch.mockReset();
		vi.stubGlobal('localStorage', createMemoryStorage());
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

	it('clears workspace code in place and reserves iframe replacement for recovery', () => {
		const runtime = track(new AppRuntime());
		const engine = getEngine();
		engine.init();

		runtime.actions.clearStorage();
		expect(engine.replaceAndRun).toHaveBeenCalledWith(expect.any(String), 'reset');
		expect(engine.reloadSandbox).not.toHaveBeenCalled();

		runtime.actions.reloadSandbox();
		expect(engine.reloadSandbox).toHaveBeenCalledOnce();
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

interface FakeTextmodeEngine {
	init: Mock<(context?: unknown) => void>;
	dispose: Mock<() => void>;
	isInitialized: Mock<() => boolean>;
	replaceAndRun: Mock<(code: string, reason?: string) => void>;
	reloadSandbox: Mock<() => void>;
}
