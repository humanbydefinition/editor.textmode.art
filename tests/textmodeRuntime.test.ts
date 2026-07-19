import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextmodeRuntime } from '../src/textmode/runtime/TextmodeRuntime';

type RuntimeOptions = {
	onHardReset?: () => void;
	onReady?: () => void;
	onRunOk?: (message: { timestamp: number }) => void;
	onUnavailable?: () => void;
};

type FakeFrame = {
	id: string;
	isConnected: boolean;
	style: {
		opacity: string;
		transition: string;
		setProperty: (name: string, value: string) => void;
	};
};

type MockRuntime = {
	dispose: ReturnType<typeof vi.fn>;
	frame: FakeFrame;
	init: ReturnType<typeof vi.fn>;
	isReady: boolean;
	runCode: ReturnType<typeof vi.fn>;
	sendAudioData: ReturnType<typeof vi.fn>;
	triggerHardReset: ReturnType<typeof vi.fn>;
};

const runnerClientMock = vi.hoisted(() => ({
	instances: [] as MockRuntime[],
}));

function createFrame(): FakeFrame {
	const style = {
		opacity: '',
		transition: '',
		setProperty(name: string, value: string) {
			(this as unknown as Record<string, string>)[name] = value;
		},
	};

	return {
		id: '',
		isConnected: true,
		style,
	};
}

vi.mock('@textmode/runner-client', () => {
	class IframeTextmodeRuntime {
		frame = createFrame();
		isReady = false;
		private pendingRejecter: ((reason: Error) => void) | null = null;

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

		readonly runCode = vi.fn(async (code: string) => {
			this.options.onRunOk?.({ timestamp: Date.now() });
			return code.length > 0;
		});

		readonly sendAudioData = vi.fn(() => this.isReady);
		readonly triggerHardReset = vi.fn(() => this.options.onHardReset?.());

		readonly activateFromUserGesture = vi.fn();

		constructor(private readonly options: RuntimeOptions) {
			runnerClientMock.instances.push(this as unknown as MockRuntime);
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
	});

	it('forces a real iframe restart when reconnecting an already-ready runner', async () => {
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
		});

		runtime.init();
		await flushPromises();
		runtime.forceRun('t.draw(() => {})');
		await flushPromises();

		const iframeRuntime = runnerClientMock.instances[0];
		expect(iframeRuntime.init).toHaveBeenCalledTimes(1);
		expect(iframeRuntime.runCode).toHaveBeenCalledWith('t.draw(() => {})');

		iframeRuntime.runCode.mockClear();
		runtime.reconnect();
		await flushPromises();

		expect(iframeRuntime.dispose).toHaveBeenCalledTimes(1);
		expect(iframeRuntime.init).toHaveBeenCalledTimes(2);
		expect(iframeRuntime.frame.id).toBe('runner-frame');
		expect(iframeRuntime.frame.style.opacity).toBe('1');
		expect(iframeRuntime.runCode).toHaveBeenCalledWith('t.draw(() => {})');
	});

	it('hard-resets by restarting the iframe and runs the requested code once', async () => {
		const runtimeRef: { current?: TextmodeRuntime } = {};
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onReady: () => runtimeRef.current?.forceRun('gallery sketch'),
		});
		runtimeRef.current = runtime;

		runtime.init();
		await flushPromises();

		const iframeRuntime = runnerClientMock.instances[0];
		iframeRuntime.runCode.mockClear();
		runtime.hardReset('gallery sketch');
		await flushPromises();

		expect(iframeRuntime.dispose).toHaveBeenCalledTimes(1);
		expect(iframeRuntime.init).toHaveBeenCalledTimes(2);
		expect(iframeRuntime.runCode).toHaveBeenCalledTimes(1);
		expect(iframeRuntime.runCode).toHaveBeenCalledWith('gallery sketch');
	});

	it('forwards audio frames once the iframe runtime is ready', async () => {
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
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

	it('forwards hard reset requests from the runner iframe', async () => {
		const onHardReset = vi.fn();
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onHardReset,
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
		});

		runtime.init();
		runtime.dispose();
		await flushPromises();

		expect(onRunnerDisconnected).not.toHaveBeenCalled();
	});

	it('reconnect after dispose is a no-op', async () => {
		const onRunnerDisconnected = vi.fn();
		const runtime = new TextmodeRuntime({
			container: document.createElement('div'),
			runnerUrl: 'https://runner.textmode.art/',
			onRunnerDisconnected,
		});

		runtime.init();
		await flushPromises();
		runtime.dispose();

		const iframeRuntime = runnerClientMock.instances[0];
		const initCallsBeforeReconnect = iframeRuntime.init.mock.calls.length;

		runtime.reconnect();
		await flushPromises();

		expect(onRunnerDisconnected).not.toHaveBeenCalled();
		expect(iframeRuntime.init.mock.calls.length).toBe(initCallsBeforeReconnect);
	});
});
