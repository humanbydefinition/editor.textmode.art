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
	onRunOk: (timestamp: number, code: string) => void;
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
	private static readonly CANDIDATE_TIMEOUT_MS = 2000;
	private static readonly RENDER_CHECKPOINT_TIMEOUT_MS = 250;
	private static readonly RENDER_CHECKPOINT_FRAMES = 2;

	private readonly options: TextmodeRuntimeOptions;
	private readonly runtime: IframeTextmodeRuntime;
	private pendingExecution: { code: string; mode: 'run' | 'reset-runtime' } | null = null;
	private activeCandidate: { error: CodeError | null } | null = null;
	private candidatePromise: Promise<boolean> | null = null;
	private userActivationRequired = false;
	private disposed = false;

	constructor(options: TextmodeRuntimeOptions) {
		this.options = options;
		this.runtime = new IframeTextmodeRuntime({
			runnerUrl: options.runnerUrl,
			mountMode: 'append',
			onReady: () => this.handleReady(),
			onRunError: (error) => this.handleRuntimeError(toCodeError(error)),
			onSynthError: (message) => this.handleSynthError({ message }),
			onHardReset: options.onHardReset,
			onToggleUI: options.onToggleUI,
			onUserActivationRequired: () => this.handleUserActivationRequired(),
			onUserInteraction: () => this.handleUserInteraction(),
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
		this.execute(code, 'run');
	}

	resetRuntime(code: string): void {
		this.execute(code, 'reset-runtime');
	}

	tryCandidate(code: string, baseline: string): Promise<boolean> {
		if (this.disposed || !this.runtime.isReady || this.candidatePromise) {
			return Promise.resolve(false);
		}

		const candidatePromise = this.performCandidateProbe(code, baseline);
		this.candidatePromise = candidatePromise;
		const clearCandidatePromise = () => {
			if (this.candidatePromise === candidatePromise) {
				this.candidatePromise = null;
			}
		};
		void candidatePromise.then(clearCandidatePromise, clearCandidatePromise);
		return candidatePromise;
	}

	reloadSandbox(code: string): void {
		if (this.disposed) return;
		this.pendingExecution = { code, mode: 'run' };
		this.setUserActivationRequired(false);

		const reconnection = this.runtime.reconnect({ rerun: false });
		this.decorateIframe();
		void reconnection.catch(() => undefined);
	}

	getCapabilities(): Record<string, boolean> {
		const advertised = (this.runtime.advertisedCapabilities ?? {}) as Record<string, boolean>;
		const client = this.runtime as unknown as WebMcpRunnerClient;
		return {
			...advertised,
			codeValidation: advertised.codeValidation === true && typeof client.validateCode === 'function',
			artworkInspection: advertised.artworkInspection === true && typeof client.inspectArtwork === 'function',
			exportPreparation: advertised.exportPreparation === true && typeof client.prepareExport === 'function',
		};
	}

	async validateCode(
		code: string,
		signal?: AbortSignal
	): Promise<{ valid: boolean; diagnostic?: { message: string; line?: number; column?: number } }> {
		const client = this.runtime as unknown as WebMcpRunnerClient;
		if (!client.validateCode)
			return { valid: false, diagnostic: { message: 'Runner does not support code validation' } };
		const result = await client.validateCode(code, { signal });
		return { valid: result.valid, diagnostic: result.diagnostic };
	}

	inspectArtwork(input: unknown, signal?: AbortSignal): Promise<unknown> {
		const client = this.runtime as unknown as WebMcpRunnerClient;
		if (!client.inspectArtwork) return Promise.reject(new Error('Runner does not support artwork inspection'));
		return client.inspectArtwork({ ...(input as object), signal });
	}

	prepareExport(input: unknown, signal?: AbortSignal): Promise<unknown> {
		const client = this.runtime as unknown as WebMcpRunnerClient;
		if (!client.prepareExport) return Promise.reject(new Error('Runner does not support export preparation'));
		return client.prepareExport({ ...(input as object), signal });
	}

	sendAudioData(data: AudioDataFrame): boolean {
		return this.runtime.sendAudioData(data);
	}

	dispose(): void {
		this.disposed = true;
		this.pendingExecution = null;
		this.activeCandidate = null;
		this.setUserActivationRequired(false);
		this.runtime.dispose();
	}

	private execute(code: string, mode: 'run' | 'reset-runtime'): void {
		if (this.disposed) return;
		if (!this.runtime.isReady) {
			this.pendingExecution = { code, mode };
			return;
		}

		this.pendingExecution = null;
		const execution = mode === 'reset-runtime' ? this.runtime.resetRuntime(code) : this.runtime.runCode(code);
		void execution.then(
			(success) => {
				if (success && !this.disposed) {
					this.options.onRunOk(Date.now(), code);
				}
			},
			(error: unknown) => this.handleRuntimeError(toCodeError(error))
		);
	}

	private async performCandidateProbe(code: string, baseline: string): Promise<boolean> {
		const candidate = { error: null as CodeError | null };
		this.activeCandidate = candidate;

		try {
			try {
				await this.runtime.probeCode(code, { timeoutMs: TextmodeRuntime.CANDIDATE_TIMEOUT_MS });
			} catch (error) {
				const reconnect = isRequestTimeout(error) || !this.runtime.isReady;
				await this.restoreBaseline(baseline, reconnect);
				return false;
			}

			const rendered = await waitForRenderCheckpoint(
				TextmodeRuntime.RENDER_CHECKPOINT_FRAMES,
				TextmodeRuntime.RENDER_CHECKPOINT_TIMEOUT_MS
			);
			if (!rendered || candidate.error) {
				await this.restoreBaseline(baseline, false);
				return false;
			}

			return true;
		} finally {
			if (this.activeCandidate === candidate) {
				this.activeCandidate = null;
			}
		}
	}

	private async restoreBaseline(code: string, reconnect: boolean): Promise<boolean> {
		if (this.disposed) return false;

		try {
			if (reconnect) {
				const reconnected = await this.runtime.reconnect({ rerun: false });
				this.decorateIframe();
				if (!reconnected) throw new Error('runner did not reconnect');
			}

			await this.runtime.runCode(code);
			return true;
		} catch (error) {
			if (!this.disposed) {
				this.options.onRunError(toCodeError(error));
			}
			return false;
		}
	}

	private handleRuntimeError(error: CodeError): void {
		const candidate = this.activeCandidate;
		if (candidate) {
			candidate.error ??= error;
			return;
		}
		this.options.onRunError(error);
	}

	private handleSynthError(error: CodeError): void {
		const candidate = this.activeCandidate;
		if (candidate) {
			candidate.error ??= error;
			return;
		}
		this.options.onSynthError?.(error);
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

	private handleUserActivationRequired(): void {
		if (this.disposed) return;
		this.setUserActivationRequired(true);
	}

	private handleUserInteraction(): void {
		if (this.disposed) return;
		this.setUserActivationRequired(false);
	}

	private flushPendingCode(): void {
		const pending = this.pendingExecution;
		if (!pending) return;
		this.execute(pending.code, pending.mode);
	}

	private setUserActivationRequired(required: boolean): void {
		this.userActivationRequired = required;
		this.updateActivationPresentation();
	}

	private decorateIframe(): void {
		const frame = this.runtime.frame;
		if (!frame) return;

		frame.id = 'runner-frame';
		frame.style.opacity = this.runtime.isReady ? '1' : '0';
		frame.style.transition = 'opacity 140ms ease';
		this.updateActivationPresentation();
	}

	private updateActivationPresentation(): void {
		document.body.classList.toggle('runner-activation-required', this.userActivationRequired);

		const frame = this.runtime.frame;
		if (!frame) return;
		if (this.userActivationRequired) {
			frame.dataset.userActivation = 'required';
		} else {
			delete frame.dataset.userActivation;
		}
	}
}

type WebMcpRunnerClient = {
	validateCode?: (
		code: string,
		options: { signal?: AbortSignal }
	) => Promise<{ valid: boolean; diagnostic?: { message: string; line?: number; column?: number } }>;
	inspectArtwork?: (options: object & { signal?: AbortSignal }) => Promise<unknown>;
	prepareExport?: (options: object & { signal?: AbortSignal }) => Promise<unknown>;
};

function toCodeError(error: unknown): CodeError {
	if (isRunnerExecutionError(error)) {
		return {
			message: error.message,
			line: error.line,
			column: error.column,
		};
	}

	return {
		message: error instanceof Error ? error.message : String(error),
	};
}

function isRunnerExecutionError(error: unknown): error is RunnerExecutionError {
	return typeof error === 'object' && error !== null && 'message' in error;
}

function isRequestTimeout(error: unknown): boolean {
	return error instanceof Error && error.message.startsWith('runner request timed out:');
}

function waitForRenderCheckpoint(frames: number, timeoutMs: number): Promise<boolean> {
	if (typeof requestAnimationFrame !== 'function') return Promise.resolve(false);

	return new Promise((resolve) => {
		let frameCount = 0;
		let frameId: number | null = null;
		let settled = false;

		const finish = (success: boolean) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timeoutId);
			if (frameId !== null) cancelAnimationFrame(frameId);
			resolve(success);
		};
		const onFrame = () => {
			frameCount += 1;
			if (frameCount >= frames) {
				finish(true);
				return;
			}
			frameId = requestAnimationFrame(onFrame);
		};
		const timeoutId = window.setTimeout(() => finish(false), timeoutMs);
		frameId = requestAnimationFrame(onFrame);
	});
}
