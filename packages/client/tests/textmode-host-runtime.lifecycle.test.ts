import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextmodeRuntime } from '../src/engines/textmode/runtime/host/TextmodeRuntime';

interface MockPort {
	postMessage: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
	start: ReturnType<typeof vi.fn>;
	onmessage: ((event: MessageEvent) => void) | null;
}

function createMockPort(): MockPort {
	return {
		postMessage: vi.fn(),
		close: vi.fn(),
		start: vi.fn(),
		onmessage: null,
	};
}

describe('TextmodeRuntime lifecycle', () => {
	const originalCreateElement = document.createElement.bind(document);

	const installIframeSandboxShim = (): void => {
		vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
			const element = originalCreateElement(tagName, options);
			if (tagName.toLowerCase() === 'iframe') {
				Object.defineProperty(element, 'sandbox', {
					configurable: true,
					value: { add: vi.fn() },
				});
			}
			return element;
		}) as typeof document.createElement);
	};

	afterEach(() => {
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});

	it('handles ready path and flushes pending code', () => {
		const container = document.createElement('div');
		document.body.appendChild(container);

		const onReady = vi.fn();
		const onRunnerConnected = vi.fn();

		const runtime = new TextmodeRuntime({
			container,
			runnerUrl: 'http://runner.test/index.html',
			onReady,
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
			onRunnerConnected,
		});

		(runtime as unknown as { runnerUnavailable: boolean }).runnerUnavailable = true;
		(runtime as unknown as { messagePort: MockPort }).messagePort = createMockPort();

		runtime.forceRun('t.draw(() => {})');
		(runtime as unknown as { handlePortMessage: (event: MessageEvent) => void }).handlePortMessage({
			data: { type: 'READY' },
		} as MessageEvent);

		expect(runtime.isReady()).toBe(true);
		expect(onReady).toHaveBeenCalledTimes(1);
		expect(onRunnerConnected).toHaveBeenCalledTimes(1);
		expect((runtime as unknown as { messagePort: MockPort }).messagePort.postMessage).toHaveBeenCalledWith({
			type: 'RUN_CODE',
			code: 't.draw(() => {})',
		});
	});

	it('emits onRunnerConnected on initial READY handshake', () => {
		const container = document.createElement('div');
		document.body.appendChild(container);

		const onRunnerConnected = vi.fn();
		const runtime = new TextmodeRuntime({
			container,
			runnerUrl: 'http://runner.test/index.html',
			onReady: vi.fn(),
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
			onRunnerConnected,
		});

		(runtime as unknown as { messagePort: MockPort }).messagePort = createMockPort();
		(runtime as unknown as { handlePortMessage: (event: MessageEvent) => void }).handlePortMessage({
			data: { type: 'READY' },
		} as MessageEvent);

		expect(onRunnerConnected).toHaveBeenCalledTimes(1);
	});

	it('handles unavailable/timeout path and preserves last requested code', () => {
		const container = document.createElement('div');
		document.body.appendChild(container);

		const onRunnerDisconnected = vi.fn();
		const runtime = new TextmodeRuntime({
			container,
			runnerUrl: 'http://runner.test/index.html',
			onReady: vi.fn(),
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
			onRunnerDisconnected,
		});

		installIframeSandboxShim();
		runtime.init();
		runtime.forceRun('t.draw(() => t.clear())');

		(runtime as unknown as { handleRunnerUnavailable: () => void }).handleRunnerUnavailable();

		expect(runtime.isReady()).toBe(false);
		expect(onRunnerDisconnected).toHaveBeenCalledTimes(1);
		expect((runtime as unknown as { pendingCode: string | null }).pendingCode).toBe('t.draw(() => t.clear())');
		expect((runtime as unknown as { iframe: HTMLIFrameElement | null }).iframe).toBeNull();
	});

	it('reconnect creates a fresh iframe instance', () => {
		const container = document.createElement('div');
		document.body.appendChild(container);

		const runtime = new TextmodeRuntime({
			container,
			runnerUrl: 'http://runner.test/index.html',
			onReady: vi.fn(),
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		installIframeSandboxShim();
		runtime.init();
		const firstIframe = (runtime as unknown as { iframe: HTMLIFrameElement | null }).iframe;
		expect(firstIframe).not.toBeNull();

		runtime.reconnect();
		const secondIframe = (runtime as unknown as { iframe: HTMLIFrameElement | null }).iframe;

		expect(secondIframe).not.toBeNull();
		expect(secondIframe).not.toBe(firstIframe);
		expect(container.querySelectorAll('iframe').length).toBe(1);
	});

	it('sends DISPOSE to runner when runtime is disposed while ready', () => {
		const container = document.createElement('div');
		document.body.appendChild(container);

		const runtime = new TextmodeRuntime({
			container,
			runnerUrl: 'http://runner.test/index.html',
			onReady: vi.fn(),
			onRunOk: vi.fn(),
			onRunError: vi.fn(),
		});

		const port = createMockPort();
		(runtime as unknown as { messagePort: MockPort }).messagePort = port;
		(runtime as unknown as { _isReady: boolean })._isReady = true;

		runtime.dispose();

		expect(port.postMessage).toHaveBeenCalledWith({ type: 'DISPOSE' });
		expect(port.close).toHaveBeenCalledTimes(1);
	});
});
