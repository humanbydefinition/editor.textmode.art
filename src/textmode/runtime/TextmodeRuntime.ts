import { IframeTextmodeRuntime, type RunnerExecutionError } from '@textmode/runner-client';
import type { CodeError } from '@/types';

export interface AudioDataFrame {
	fft: Uint8Array;
	waveform: Uint8Array;
	timestamp: number;
}

export interface TextmodeRuntimeOptions {
	runnerUrl: string;
	container: HTMLElement;
	onRunOk: (timestamp: number) => void;
	onRunError: (error: CodeError) => void;
	onSynthError?: (error: CodeError) => void;
	onToggleUI?: () => void;
	onHardReset?: () => void;
	onRunnerConnected?: () => void;
	onRunnerDisconnected?: () => void;
}

/**
 * Adapts the shared runner client to editor-specific execution errors, iframe
 * presentation, and the latest code requested before the runner becomes ready.
 */
export class TextmodeRuntime {
	private readonly options: TextmodeRuntimeOptions;
	private readonly runtime: IframeTextmodeRuntime;
	private pendingExecution: { code: string; mode: 'run' | 'reset-runtime' } | null = null;
	private disposed = false;

	constructor(options: TextmodeRuntimeOptions) {
		this.options = options;
		this.runtime = new IframeTextmodeRuntime({
			runnerUrl: options.runnerUrl,
			mountMode: 'append',
			onReady: () => this.handleReady(),
			onRunOk: (message) => options.onRunOk(message.timestamp),
			onRunError: (error) => options.onRunError(toCodeError(error)),
			onSynthError: (message) => options.onSynthError?.({ message }),
			onHardReset: options.onHardReset,
			onToggleUI: options.onToggleUI,
			onUnavailable: () => this.handleUnavailable(),
		});
	}

	init(initialCode = ''): void {
		if (initialCode) {
			this.pendingExecution = { code: initialCode, mode: 'run' };
		}

		const initialization = this.runtime.init(this.options.container);
		this.decorateIframe();
		void initialization.catch(() => undefined);
	}

	forceRun(code: string): void {
		if (this.disposed) return;
		if (!this.runtime.isReady) {
			this.pendingExecution = { code, mode: 'run' };
			return;
		}

		this.pendingExecution = null;
		void this.runtime.runCode(code).catch((error) => {
			this.options.onRunError(toCodeError(error));
		});
	}

	resetRuntime(code: string): void {
		if (this.disposed) return;
		if (!this.runtime.isReady) {
			this.pendingExecution = { code, mode: 'reset-runtime' };
			return;
		}

		this.pendingExecution = null;
		void this.runtime.resetRuntime(code).catch((error) => {
			this.options.onRunError(toCodeError(error));
		});
	}

	reloadSandbox(code: string): void {
		if (this.disposed) return;
		this.pendingExecution = { code, mode: 'run' };

		const reconnection = this.runtime.reconnect({ rerun: false });
		this.decorateIframe();
		void reconnection.catch(() => undefined);
	}

	sendAudioData(data: AudioDataFrame): boolean {
		return this.runtime.sendAudioData(data);
	}

	dispose(): void {
		this.disposed = true;
		this.pendingExecution = null;
		this.runtime.dispose();
	}

	private handleReady(): void {
		if (this.disposed) return;
		this.decorateIframe();
		this.options.onRunnerConnected?.();
		this.flushPendingCode();
	}

	private handleUnavailable(): void {
		if (this.disposed) return;
		this.options.onRunnerDisconnected?.();
	}

	private flushPendingCode(): void {
		const pending = this.pendingExecution;
		if (!pending) return;
		if (pending.mode === 'reset-runtime') {
			this.resetRuntime(pending.code);
			return;
		}
		this.forceRun(pending.code);
	}

	private decorateIframe(): void {
		const frame = this.runtime.frame;
		if (!frame) return;

		frame.id = 'runner-frame';
		frame.style.opacity = this.runtime.isReady ? '1' : '0';
		frame.style.transition = 'opacity 140ms ease';
	}
}

function toCodeError(error: unknown): CodeError {
	if (isRunnerExecutionError(error)) {
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

function isRunnerExecutionError(error: unknown): error is RunnerExecutionError {
	return typeof error === 'object' && error !== null && 'message' in error;
}
