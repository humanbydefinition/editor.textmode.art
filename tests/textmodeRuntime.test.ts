import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextmodeRuntime } from '../src/textmode/runtime/TextmodeRuntime';

type RuntimeOptions = {
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

		readonly init = vi.fn(async () => {
			this.frame = createFrame();
			this.isReady = true;
			this.options.onReady?.();
			return true;
		});

		readonly dispose = vi.fn(() => {
			this.isReady = false;
			this.frame.isConnected = false;
		});

		readonly runCode = vi.fn(async (code: string) => {
			this.options.onRunOk?.({ timestamp: Date.now() });
			return code.length > 0;
		});

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
});
