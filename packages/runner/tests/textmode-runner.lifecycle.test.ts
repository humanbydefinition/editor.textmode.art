// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
	textmodeInstances: [] as Array<{
		init: ReturnType<typeof vi.fn>;
		pause: ReturnType<typeof vi.fn>;
		resume: ReturnType<typeof vi.fn>;
		isRendering: ReturnType<typeof vi.fn>;
		cleanupLayers: ReturnType<typeof vi.fn>;
		setupSynthErrorHandler: ReturnType<typeof vi.fn>;
		getInstance: ReturnType<typeof vi.fn>;
		dispose: ReturnType<typeof vi.fn>;
	}>,
	contextInstances: [] as Array<{
		validateSyntax: ReturnType<typeof vi.fn>;
		execute: ReturnType<typeof vi.fn>;
		dispose: ReturnType<typeof vi.fn>;
	}>,
	schedulerInstances: [] as Array<{
		schedule: ReturnType<typeof vi.fn>;
		cancel: ReturnType<typeof vi.fn>;
	}>,
}));

vi.mock('@/engines/textmode/TextmodeManager', () => ({
	TextmodeManager: class MockTextmodeManager {
		init = vi.fn();
		pause = vi.fn();
		resume = vi.fn();
		isRendering = vi.fn(() => false);
		cleanupLayers = vi.fn();
		setupSynthErrorHandler = vi.fn();
		getInstance = vi.fn(() => null);
		dispose = vi.fn();

		constructor() {
			mocked.textmodeInstances.push(this);
		}
	},
}));

vi.mock('@/engines/textmode/ExecutionContext', () => ({
	ExecutionContext: class MockExecutionContext {
		validateSyntax = vi.fn(() => ({ valid: true }));
		execute = vi.fn(() => ({ success: true }));
		dispose = vi.fn();

		constructor() {
			mocked.contextInstances.push(this);
		}
	},
}));

vi.mock('@/engines/textmode/FrameScheduler', () => ({
	FrameScheduler: class MockFrameScheduler {
		schedule = vi.fn();
		cancel = vi.fn();

		constructor() {
			mocked.schedulerInstances.push(this);
		}
	},
}));

import { TextmodeEngine as TextmodeRunner } from '../src/engines/textmode/TextmodeEngine';

describe('TextmodeRunner lifecycle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocked.textmodeInstances.length = 0;
		mocked.contextInstances.length = 0;
		mocked.schedulerInstances.length = 0;
	});

	it('cleans up listeners/resources on dispose()', () => {
		const addSpy = vi.spyOn(window, 'addEventListener');
		const removeSpy = vi.spyOn(window, 'removeEventListener');
		const runner = new TextmodeRunner(new Set(['*'])) as unknown as {
			start: () => void;
			dispose: () => void;
			attachPort: (port: any, onMessage: any) => void;
			isPortAttached: () => boolean;
		};
		const portClose = vi.fn();
		const mockPort = {
			close: portClose,
			start: vi.fn(),
			onmessage: null,
		};

		runner.start();
		runner.attachPort(mockPort, vi.fn());
		runner.dispose();

		expect(addSpy).toHaveBeenCalledWith('message', expect.any(Function));
		expect(addSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), { passive: true });
		expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
		expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));
		expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
		expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

		expect(mocked.schedulerInstances[0]?.cancel).toHaveBeenCalledTimes(1);
		expect(mocked.contextInstances[0]?.dispose).toHaveBeenCalledTimes(1);
		expect(mocked.textmodeInstances[0]?.dispose).toHaveBeenCalledTimes(1);
		expect(portClose).toHaveBeenCalledTimes(1);
		expect(runner.isPortAttached()).toBe(false);
	});

	it('can start and dispose repeatedly without leaking handlers', () => {
		const runner = new TextmodeRunner(new Set(['*'])) as unknown as { start: () => void; dispose: () => void };

		expect(() => {
			runner.start();
			runner.dispose();
			runner.start();
			runner.dispose();
		}).not.toThrow();

		expect(mocked.textmodeInstances[0]?.init).toHaveBeenCalledTimes(2);
		expect(mocked.textmodeInstances[0]?.dispose).toHaveBeenCalledTimes(2);
		expect(mocked.contextInstances[0]?.dispose).toHaveBeenCalledTimes(2);
		expect(mocked.schedulerInstances[0]?.cancel).toHaveBeenCalledTimes(2);
	});

	it('keeps RUN_CODE and SOFT_RESET scheduling behavior unchanged', () => {
		const runner = new TextmodeRunner(new Set(['*'])) as unknown as {
			start: () => void;
			handlePortMessage: (event: MessageEvent) => void;
		};

		runner.start();
		runner.handlePortMessage({ data: { type: 'RUN_CODE', code: 't.draw(() => {})' } } as MessageEvent);
		runner.handlePortMessage({ data: { type: 'SOFT_RESET', code: 't.clear()' } } as MessageEvent);

		expect(mocked.schedulerInstances[0]?.schedule).toHaveBeenNthCalledWith(1, {
			code: 't.draw(() => {})',
			isSoftReset: false,
		});
		expect(mocked.schedulerInstances[0]?.schedule).toHaveBeenNthCalledWith(2, {
			code: 't.clear()',
			isSoftReset: true,
		});
	});
});
