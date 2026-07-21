import { IframeTextmodeRuntime, type RunnerExecutionError } from '@textmode/runner-client';
import type { IHostRuntime, HostRuntimeOptions } from './types';
import type { CodeError } from '@/types';

const HANDSHAKE_TIMEOUT_MS = 5000;

export interface AudioDataFrame {
	fft: Uint8Array;
	waveform: Uint8Array;
	timestamp: number;
}

interface AudioCapableRuntime {
	sendAudioData?: (data: AudioDataFrame) => boolean;
	postMessage?: (message: { type: 'AUDIO_DATA' } & AudioDataFrame) => void;
}

/**
 * TextmodeRuntime preserves synth's host runtime surface while delegating the
 * iframe transport and current runner protocol to the shared client package.
 */
export class TextmodeRuntime implements IHostRuntime {
	readonly strategy = 'sandboxed' as const;

	private readonly container: HTMLElement;
	private readonly runtime: IframeTextmodeRuntime;
	private readonly options: HostRuntimeOptions;
	private isRuntimeReady = false;
	private pendingCode: string | null = null;
	private lastRequestedCode: string | null = null;
	private runnerUnavailable = false;
	private disposed = false;

	private onReadyCallback?: () => void;
	private onRunOk?: (timestamp: number) => void;
	private onRunError?: (error: CodeError) => void;
	private onSynthError?: (error: CodeError) => void;
	private onUserInteractionCallback?: () => void;
	private onRunnerConnected?: () => void;
	private onRunnerDisconnected?: () => void;

	constructor(options: HostRuntimeOptions) {
		this.options = options;
		this.container = options.container;
		this.onReadyCallback = options.onReady;
		this.onRunOk = options.onRunOk;
		this.onRunError = options.onRunError;
		this.onSynthError = options.onSynthError;
		this.onRunnerConnected = options.onRunnerConnected;
		this.onRunnerDisconnected = options.onRunnerDisconnected;

		this.runtime = new IframeTextmodeRuntime({
			runnerUrl: options.runnerUrl,
			mountMode: 'append',
			handshakeTimeoutMs: HANDSHAKE_TIMEOUT_MS,
			onReady: () => this.handleReady(),
			onRunOk: (message) => {
				this.onRunOk?.(message.timestamp);
			},
			onRunError: (error) => {
				this.onRunError?.(this.toCodeError(error));
			},
			onSynthError: (message) => {
				this.onSynthError?.({ message });
			},
			onHardReset: () => {
				this.options.onHardReset?.();
			},
			onToggleUI: () => {
				this.options.onToggleUI?.();
			},
			onUserInteraction: () => {
				this.onUserInteractionCallback?.();
			},
			onUnavailable: () => {
				this.handleRunnerUnavailable();
			},
		});
	}

	/**
	 * Create and initialize the iframe.
	 */
	init(): void {
		this.startRuntime();
	}

	/**
	 * Check if iframe is ready to receive code.
	 */
	isReady(): boolean {
		return this.isRuntimeReady && this.runtime.isReady;
	}

	/**
	 * Run code immediately.
	 */
	forceRun(code: string): void {
		this.lastRequestedCode = code;
		if (!this.isReady()) {
			this.setPendingCode(code);
			return;
		}

		this.clearPendingCode();
		void this.runtime.runCode(code).catch((error) => {
			this.onRunError?.(this.toCodeError(error));
		});
	}

	/**
	 * Hard reset - recreate the iframe so textmode setup and resource initialization run again.
	 */
	hardReset(code: string): void {
		if (this.disposed) return;

		this.lastRequestedCode = code;
		this.setPendingCode(code);
		this.restartRuntime();
	}

	sendAudioData(data: AudioDataFrame): boolean {
		if (!this.isReady()) return false;

		const runtime = this.runtime as unknown as AudioCapableRuntime;
		if (runtime.sendAudioData) {
			return runtime.sendAudioData(data);
		}

		if (runtime.postMessage) {
			runtime.postMessage({ type: 'AUDIO_DATA', ...data });
			return true;
		}

		return false;
	}

	setOnUserInteraction(callback: (() => void) | undefined): void {
		this.onUserInteractionCallback = callback;
	}

	/**
	 * Manually retry loading the runner iframe.
	 */
	reconnect(): void {
		if (this.disposed) return;
		if (this.pendingCode === null && this.lastRequestedCode !== null) {
			this.setPendingCode(this.lastRequestedCode);
		}
		this.restartRuntime();
	}

	/**
	 * Trigger iframe activation from a trusted user gesture (e.g. click).
	 * Safari/WebKit may unlock full requestAnimationFrame cadence after this.
	 */
	activateFromUserGesture(): void {
		this.runtime.activateFromUserGesture();
	}

	/**
	 * Cleanup.
	 */
	dispose(): void {
		this.disposed = true;
		this.isRuntimeReady = false;
		this.pendingCode = null;
		this.runtime.dispose();
	}

	private startRuntime(): void {
		this.isRuntimeReady = false;

		void this.runtime
			.init(this.container)
			.then(() => {
				if (this.disposed) return;
				this.decorateIframe();
			})
			.catch(() => {
				if (this.disposed) return;
				this.handleRunnerUnavailable();
			});

		this.decorateIframe();
	}

	private handleReady(): void {
		const wasUnavailable = this.runnerUnavailable;
		this.isRuntimeReady = true;
		this.decorateIframe();
		this.runtime.frame?.style.setProperty('opacity', '1');
		this.setRunnerUnavailable(false);

		if (!wasUnavailable) {
			this.onRunnerConnected?.();
		}

		this.onReadyCallback?.();
		this.flushPendingCode();
	}

	private handleRunnerUnavailable(): void {
		this.isRuntimeReady = false;

		if (this.pendingCode === null && this.lastRequestedCode !== null) {
			this.setPendingCode(this.lastRequestedCode);
		}

		this.setRunnerUnavailable(true);
	}

	private setPendingCode(code: string): void {
		this.pendingCode = code;
	}

	private clearPendingCode(): void {
		this.pendingCode = null;
	}

	private restartRuntime(): void {
		this.runtime.dispose();
		this.startRuntime();
	}

	private flushPendingCode(): void {
		if (this.pendingCode === null) return;

		const code = this.pendingCode;
		this.clearPendingCode();
		this.forceRun(code);
	}

	private setRunnerUnavailable(isUnavailable: boolean): void {
		if (this.runnerUnavailable === isUnavailable) return;
		this.runnerUnavailable = isUnavailable;
		if (isUnavailable) {
			this.onRunnerDisconnected?.();
			return;
		}
		this.onRunnerConnected?.();
	}

	private decorateIframe(): void {
		const frame = this.runtime.frame;
		if (!frame) return;

		frame.id = 'runner-frame';
		frame.style.opacity = this.isRuntimeReady ? '1' : '0';
		frame.style.transition = 'opacity 140ms ease';
	}

	private toCodeError(error: unknown): CodeError {
		if (this.isRunnerExecutionError(error)) {
			return {
				message: error.message,
				stack: error.stack,
				line: error.line,
				column: error.column,
			};
		}

		return {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		};
	}

	private isRunnerExecutionError(error: unknown): error is RunnerExecutionError {
		return typeof error === 'object' && error !== null && 'message' in error;
	}
}
