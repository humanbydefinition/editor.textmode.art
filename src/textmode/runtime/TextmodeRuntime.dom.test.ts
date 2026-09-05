import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { TextmodeRuntime } from './TextmodeRuntime';

type RuntimeOptions = {
	onHardReset?: () => void;
	onReady?: () => void;
	onRunError?: (error: { message: string; line?: number; column?: number }) => void;
	onRunOk?: (message: { timestamp: number }) => void;
	onSynthError?: (message: string) => void;
	onUnavailable?: () => void;
	onUserActivationRequired?: () => void;
	onUserInteraction?: () => void;
};

type FakeFrame = {
	id: string;
	isConnected: boolean;
	dataset: Record<string, string>;
	style: {
		opacity: string;
		transition: string;
		setProperty: (name: string, value: string) => void;
	};
};

type MockRuntime = {
	dispose: Mock<() => void>;
	frame: FakeFrame;
	init: Mock<(container?: HTMLElement) => Promise<boolean>>;
	isReady: boolean;
	reconnect: Mock<(options?: { rerun?: boolean }) => Promise<boolean>>;
	probeCode: Mock<(code: string, options?: { timeoutMs?: number }) => Promise<boolean>>;
	resetRuntime: Mock<(code: string) => Promise<boolean>>;
	runCode: Mock<(code: string) => Promise<boolean>>;
	sendAudioData: Mock<(frame: unknown) => boolean>;
	sendMouseEvent: Mock<(event: unknown) => boolean>;
	triggerHardReset: Mock<() => void>;
	triggerRunError: Mock<(error: { message: string; line?: number; column?: number }) => void>;
	triggerSynthError: Mock<(message: string) => void>;
	triggerUserActivationRequired: Mock<() => void>;
	triggerUserInteraction: Mock<() => void>;
};

const runnerClientMock = vi.hoisted(() => ({
	instances: [] as MockRuntime[],
}));

function createFrame(): FakeFrame {
	const style: FakeFrame['style'] = {
		opacity: '',
		transition: '',
		setProperty(name: string, value: string) {
			if (name === 'opacity' || name === 'transition') {
				style[name] = value;
			}
		},
	};

	return {
		id: '',
		isConnected: true,
		dataset: {},
		style,
	};
}

vi.mock('@textmode/runner-client', () => {
	class IframeTextmodeRuntime {
		frame = createFrame();
		isReady = false;
		private pendingRejecter: ((reason: Error) => void) | null = null;
		private readonly options: RuntimeOptions;

		readonly init = vi.fn(async () => {
			return new Promise<boolean>((resolve, reject) => {
				this.pendingRejecter = reject;
				this.frame = createFrame();
				this.isReady = true;
				this.options.onReady?.();
				resolve(true);
			});
		});

		readonly dispose = vi.fn(() => {
			this.pendingRejecter?.(new Error('runner disposed'));
			this.pendingRejecter = null;
			this.isReady = false;
			this.frame.isConnected = false;
		});

		readonly reconnect = vi.fn(async () => {
			this.isReady = false;
			this.frame.isConnected = false;
			this.frame = createFrame();
			this.isReady = true;
			this.options.onReady?.();
			return true;
		});

		readonly runCode = vi.fn(async (code: string) => {
			this.options.onRunOk?.({ timestamp: Date.now() });
			return code.length > 0;
		});
		readonly probeCode = vi.fn(async (code: string) => code.length > 0);
		readonly resetRuntime = vi.fn(async (code: string) => {
			this.options.onRunOk?.({ timestamp: Date.now() });
			return code.length > 0;
		});

		readonly sendAudioData = vi.fn(() => this.isReady);
		readonly sendMouseEvent = vi.fn(() => this.isReady);
		readonly triggerHardReset = vi.fn(() => this.options.onHardReset?.());
		readonly triggerRunError = vi.fn((error: { message: string; line?: number; column?: number }) =>
			this.options.onRunError?.(error)
		);
		readonly triggerSynthError = vi.fn((message: string) => this.options.onSynthError?.(message));
		readonly triggerUserActivationRequired = vi.fn(() => this.options.onUserActivationRequired?.());
		readonly triggerUserInteraction = vi.fn(() => this.options.onUserInteraction?.());

		constructor(options: RuntimeOptions) {
			this.options = options;
			runnerClientMock.instances.push(this);
		}
	}

	return { IframeTextmodeRuntime };
});

async function flushPromises(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

describe('TextmodeRuntime', () => {
	beforeEach(() => {
		runnerClientMock.instances = [];
		document.body.classList.remove('runner-activation-required');
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('resets the runtime without replacing the iframe', async () => {
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		runtime.init();
		await flushPromises();
		runtime.forceRun('t.draw(() => {})');
		await flushPromises();

		const iframeRuntime = runnerClientMock.instances[0];
		expect(iframeRuntime.init).toHaveBeenCalledTimes(1);
		expect(iframeRuntime.runCode).toHaveBeenCalledWith('t.draw(() => {})');

		const originalFrame = iframeRuntime.frame;
		iframeRuntime.runCode.mockClear();
		runtime.resetRuntime('t.draw(() => {})');
		await flushPromises();

		expect(iframeRuntime.resetRuntime).toHaveBeenCalledWith('t.draw(() => {})');
		expect(iframeRuntime.reconnect).not.toHaveBeenCalled();
		expect(iframeRuntime.dispose).not.toHaveBeenCalled();
		expect(iframeRuntime.init).toHaveBeenCalledTimes(1);
		expect(iframeRuntime.frame).toBe(originalFrame);
		expect(iframeRuntime.frame.id).toBe('runner-frame');
		expect(iframeRuntime.frame.style.opacity).toBe('1');
		expect(iframeRuntime.runCode).not.toHaveBeenCalled();
	});

	it('reloads the iframe sandbox and runs the requested code once', async () => {
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		runtime.init();
		await flushPromises();

		const iframeRuntime = runnerClientMock.instances[0];
		iframeRuntime.runCode.mockClear();
		runtime.reloadSandbox('gallery sketch');
		await flushPromises();

		expect(iframeRuntime.reconnect).toHaveBeenCalledWith({ rerun: false });
		expect(iframeRuntime.runCode).toHaveBeenCalledTimes(1);
		expect(iframeRuntime.runCode).toHaveBeenCalledWith('gallery sketch');
	});

	it('exposes only the runner activation cutout until trusted interaction', async () => {
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		runtime.init();
		await flushPromises();

		const iframeRuntime = runnerClientMock.instances[0];
		const originalFrame = iframeRuntime.frame;
		iframeRuntime.triggerUserActivationRequired();

		expect(iframeRuntime.frame).toBe(originalFrame);
		expect(iframeRuntime.frame.dataset.userActivation).toBe('required');
		expect(document.body.classList.contains('runner-activation-required')).toBe(true);

		runtime.resetRuntime('fresh sketch');
		await flushPromises();
		expect(iframeRuntime.frame).toBe(originalFrame);
		expect(iframeRuntime.frame.dataset.userActivation).toBe('required');
		expect(document.body.classList.contains('runner-activation-required')).toBe(true);

		iframeRuntime.triggerUserInteraction();
		expect(iframeRuntime.frame.dataset.userActivation).toBeUndefined();
		expect(document.body.classList.contains('runner-activation-required')).toBe(false);
	});

	it('clears activation presentation while replacing the sandbox', async () => {
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		runtime.init();
		await flushPromises();

		const iframeRuntime = runnerClientMock.instances[0];
		iframeRuntime.triggerUserActivationRequired();
		runtime.reloadSandbox('fresh sketch');
		await flushPromises();

		expect(iframeRuntime.frame.dataset.userActivation).toBeUndefined();
		expect(document.body.classList.contains('runner-activation-required')).toBe(false);
	});

	it('runs only the latest code requested before initial readiness', async () => {
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		runtime.forceRun('first sketch');
		runtime.forceRun('latest sketch');
		runtime.init();
		await flushPromises();

		expect(runnerClientMock.instances[0].runCode).toHaveBeenCalledTimes(1);
		expect(runnerClientMock.instances[0].runCode).toHaveBeenCalledWith('latest sketch');
	});

	it('forwards audio frames once the iframe runtime is ready', async () => {
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});
		const frame = {
			fft: new Uint8Array([1, 2]),
			waveform: new Uint8Array([128, 129]),
			timestamp: 123,
		};

		expect(runtime.sendAudioData(frame)).toBe(false);

		runtime.init();
		await flushPromises();

		expect(runtime.sendAudioData(frame)).toBe(true);
		expect(runnerClientMock.instances[0].sendAudioData).toHaveBeenCalledWith(frame);
	});

	it('sends mouse events through the runner client only after initialization', async () => {
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});
		const event = {
			eventType: 'mousemove' as const,
			clientX: 120,
			clientY: 240,
			buttons: 1,
		};

		expect(runtime.sendMouseEvent(event)).toBe(false);

		runtime.init();
		await flushPromises();

		expect(runtime.sendMouseEvent(event)).toBe(true);
		expect(runnerClientMock.instances[0].sendMouseEvent).toHaveBeenCalledWith(event);
	});

	it('forwards hard reset requests from the runner iframe', async () => {
		const onHardReset = vi.fn();
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onHardReset,
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		runtime.init();
		await flushPromises();
		runnerClientMock.instances[0].triggerHardReset();

		expect(onHardReset).toHaveBeenCalledTimes(1);
	});

	it('does not fire unavailable callbacks when disposed during a pending handshake', async () => {
		const onRunnerDisconnected = vi.fn();
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunnerDisconnected,
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		runtime.init();
		runtime.dispose();
		await flushPromises();

		expect(onRunnerDisconnected).not.toHaveBeenCalled();
	});

	it('reset and sandbox reload after dispose are no-ops', async () => {
		const onRunnerDisconnected = vi.fn();
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunnerDisconnected,
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		runtime.init();
		await flushPromises();
		runtime.dispose();

		const iframeRuntime = runnerClientMock.instances[0];
		const reconnectCallsBeforeRestart = iframeRuntime.reconnect.mock.calls.length;

		runtime.resetRuntime('t.draw(() => {})');
		runtime.reloadSandbox('t.draw(() => {})');
		await flushPromises();

		expect(onRunnerDisconnected).not.toHaveBeenCalled();
		expect(iframeRuntime.resetRuntime).not.toHaveBeenCalled();
		expect(iframeRuntime.reconnect.mock.calls.length).toBe(reconnectCallsBeforeRestart);
	});

	it('accepts a candidate only after two error-free animation frames', async () => {
		vi.useFakeTimers();
		installAnimationFrameStub();
		const onRunOk = vi.fn();
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk,
			onRunError: vi.fn(),
		});

		runtime.init();
		await flushPromises();
		const result = runtime.tryCandidate('candidate sketch', 'working sketch');
		await flushPromises();
		await vi.advanceTimersByTimeAsync(40);

		await expect(result).resolves.toBe(true);
		expect(runnerClientMock.instances[0].probeCode).toHaveBeenCalledWith('candidate sketch', {
			timeoutMs: 2000,
		});
		expect(onRunOk).not.toHaveBeenCalled();
	});

	it('suppresses a candidate draw error and restores the baseline before rejecting', async () => {
		vi.useFakeTimers();
		installAnimationFrameStub();
		const onRunError = vi.fn();
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError,
		});

		runtime.init();
		await flushPromises();
		const iframeRuntime = runnerClientMock.instances[0];
		const result = runtime.tryCandidate('candidate sketch', 'working sketch');
		await flushPromises();
		iframeRuntime.triggerRunError({
			message: "Cannot read properties of undefined (reading 'width')",
		});
		await vi.advanceTimersByTimeAsync(40);

		await expect(result).resolves.toBe(false);
		expect(iframeRuntime.runCode).toHaveBeenCalledWith('working sketch');
		expect(onRunError).not.toHaveBeenCalled();
	});

	it('suppresses a candidate synth error and restores the baseline before rejecting', async () => {
		vi.useFakeTimers();
		installAnimationFrameStub();
		const onSynthError = vi.fn();
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
			onSynthError,
		});

		runtime.init();
		await flushPromises();
		const iframeRuntime = runnerClientMock.instances[0];
		const result = runtime.tryCandidate('candidate sketch', 'working sketch');
		await flushPromises();
		iframeRuntime.triggerSynthError('invalid shader uniform');
		await vi.advanceTimersByTimeAsync(40);

		await expect(result).resolves.toBe(false);
		expect(iframeRuntime.runCode).toHaveBeenCalledWith('working sketch');
		expect(onSynthError).not.toHaveBeenCalled();
	});

	it('reconnects without the candidate and restores the baseline after a probe timeout', async () => {
		const onRunError = vi.fn();
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunOk: vi.fn(),
			onRunError,
		});

		runtime.init();
		await flushPromises();
		const iframeRuntime = runnerClientMock.instances[0];
		iframeRuntime.probeCode.mockRejectedValue(new Error('runner request timed out: RUN_CODE'));

		await expect(runtime.tryCandidate('hung sketch', 'working sketch')).resolves.toBe(false);

		expect(iframeRuntime.reconnect).toHaveBeenCalledWith({ rerun: false });
		expect(iframeRuntime.runCode).toHaveBeenCalledWith('working sketch');
		expect(onRunError).not.toHaveBeenCalled();
	});
});

function installAnimationFrameStub(): void {
	let nextId = 0;
	const timers = new Map<number, ReturnType<typeof setTimeout>>();
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		const id = ++nextId;
		timers.set(
			id,
			setTimeout(() => {
				timers.delete(id);
				callback(performance.now());
			}, 16)
		);
		return id;
	});
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		const timer = timers.get(id);
		if (timer !== undefined) clearTimeout(timer);
		timers.delete(id);
	});
}
