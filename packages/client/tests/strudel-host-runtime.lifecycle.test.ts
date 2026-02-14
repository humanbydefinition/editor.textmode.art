import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrudelHostRuntime } from '../src/engines/strudel/runtime/host/StrudelHostRuntime';

describe('StrudelHostRuntime lifecycle', () => {
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

	it('marks runtime initialized on STR_READY with audio initialized', () => {
		installIframeSandboxShim();
		const onReady = vi.fn();
		const runtime = new StrudelHostRuntime({
			runnerUrl: 'http://runner.test/strudel.html',
			onReady,
			onError: vi.fn(),
			onPatternUpdate: vi.fn(),
			onPlayStateChange: vi.fn(),
		});

		(
			runtime as unknown as {
				processRunnerMessage: (msg: {
					type: 'STR_READY';
					runtimeInitialized: boolean;
					audioInitialized: boolean;
				}) => void;
			}
		).processRunnerMessage({
			type: 'STR_READY',
			runtimeInitialized: true,
			audioInitialized: true,
		});

		expect(runtime.isInitialized()).toBe(true);
		expect(onReady).toHaveBeenCalledTimes(1);

		runtime.dispose();
	});

	it('handles handshake failure path by clearing readiness/init state', () => {
		installIframeSandboxShim();
		const runtime = new StrudelHostRuntime({
			runnerUrl: 'http://runner.test/strudel.html',
			onReady: vi.fn(),
			onError: vi.fn(),
			onPatternUpdate: vi.fn(),
			onPlayStateChange: vi.fn(),
		});

		(runtime as unknown as { failHandshake: () => void }).failHandshake();

		expect(runtime.isInitialized()).toBe(false);
		expect((runtime as unknown as { isReady: boolean }).isReady).toBe(false);
		expect((runtime as unknown as { audioInitPromise: Promise<void> | null }).audioInitPromise).toBeNull();
		expect((runtime as unknown as { readyPromise: Promise<void> | null }).readyPromise).toBeNull();

		runtime.dispose();
	});

	it('processes window-message fallback when MessagePort inbound is unhealthy', () => {
		installIframeSandboxShim();
		const onPlayStateChange = vi.fn();
		const runtime = new StrudelHostRuntime({
			runnerUrl: 'http://runner.test/strudel.html',
			onReady: vi.fn(),
			onError: vi.fn(),
			onPatternUpdate: vi.fn(),
			onPlayStateChange,
		});

		const iframeWindow = {} as Window;
		const iframe = (runtime as unknown as { iframe: HTMLIFrameElement | null }).iframe;
		expect(iframe).not.toBeNull();
		Object.defineProperty(iframe as HTMLIFrameElement, 'contentWindow', {
			configurable: true,
			value: iframeWindow,
		});
		(runtime as unknown as { portInboundHealthy: boolean }).portInboundHealthy = false;

		(
			runtime as unknown as {
				handleWindowMessage: (event: MessageEvent) => void;
			}
		).handleWindowMessage({
			source: iframeWindow,
			origin: 'http://runner.test',
			data: {
				type: 'STRUDEL_RUNNER_EVENT',
				message: {
					type: 'STR_PLAY_STATE',
					isPlaying: true,
					cycle: 4,
					haps: [],
				},
			},
		} as MessageEvent);

		expect(onPlayStateChange).toHaveBeenCalledWith(true);
		expect(runtime.getCycle()).toBe(4);

		runtime.dispose();
	});
});
