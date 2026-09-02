import type { CodeError } from '@/types';

const CONFIRMATION_DELAY_MS = 100;

export interface TextmodeControllerCallbacks {
	onSaveCode: (code: string) => void;
}

export interface TextmodeControllerState {
	clearError: () => void;
	setError: (error: CodeError) => void;
	getLastWorkingCode: () => string | null;
	setLastWorkingCode: (code: string | null) => void;
}

export interface TextmodeControllerEditor {
	getValue(): string;
	setValue(value: string, options?: { silent?: boolean }): void;
	clearMarkers(): void;
	setErrorMarker(error: CodeError): void;
}

export interface TextmodeControllerRuntime {
	forceRun(code: string): void;
	resetRuntime(code: string): void;
	tryCandidate(code: string, baseline: string): Promise<boolean>;
}

export interface TextmodeControllerDependencies {
	editor: TextmodeControllerEditor;
	runtime: TextmodeControllerRuntime;
	getAutoExecute: () => boolean;
	getAutoExecuteDelay: () => number;
	state: TextmodeControllerState;
	isExecutionLocked: () => boolean;
	onCodeChanged: (code: string) => void;
}

/**
 * Handles textmode code execution, runtime events, debouncing, and revert flow.
 */
export class TextmodeController {
	private readonly callbacks: TextmodeControllerCallbacks;
	private readonly deps: TextmodeControllerDependencies;
	private debounceTimer: number | null = null;
	private confirmationTimer: number | null = null;
	private pendingWorkingCode: string | null = null;
	private candidateInFlight = false;
	private editorVersion = 0;
	private preview: { code: string; baseline: string; version: number } | null = null;

	constructor(callbacks: TextmodeControllerCallbacks, deps: TextmodeControllerDependencies) {
		this.callbacks = callbacks;
		this.deps = deps;
	}

	dispose(): void {
		this.clearDebounce();
		this.clearConfirmationTimer();
	}

	handleCodeChange(code: string): void {
		this.preview = null;
		if (this.isExecutionLocked()) return;
		this.editorVersion += 1;
		this.deps.onCodeChanged(code);
		this.callbacks.onSaveCode(code);
		this.clearDebounce();

		if (!this.deps.getAutoExecute()) return;

		this.debounceTimer = window.setTimeout(() => {
			this.debounceTimer = null;
			this.deps.runtime.forceRun(code);
		}, this.deps.getAutoExecuteDelay());
	}

	handleForceRun(): void {
		if (this.isExecutionLocked()) return;
		this.execute(this.deps.editor.getValue(), 'run');
	}

	replaceAndRun(code: string, reason: 'run' | 'reset-runtime' = 'run'): void {
		if (this.isExecutionLocked()) return;
		this.replaceCode(code);
		this.execute(code, reason, reason !== 'reset-runtime');
	}

	async tryReplaceAndRun(code: string): Promise<boolean> {
		if (this.isExecutionLocked() || this.candidateInFlight) return false;

		const baseline = this.deps.editor.getValue();
		const baselineVersion = this.editorVersion;
		if (code === baseline) return false;

		this.candidateInFlight = true;
		try {
			const accepted = await this.deps.runtime.tryCandidate(code, baseline);
			if (!accepted) return false;

			const currentCode = this.deps.editor.getValue();
			if (currentCode !== baseline || this.editorVersion !== baselineVersion) {
				this.deps.runtime.forceRun(currentCode);
				return false;
			}

			this.cancelPendingWorkingCode();
			this.replaceCode(code);
			this.callbacks.onSaveCode(code);
			this.deps.state.setLastWorkingCode(code);
			this.deps.state.clearError();
			this.deps.editor.clearMarkers();
			return true;
		} finally {
			this.candidateInFlight = false;
		}
	}

	getRevision(): number {
		return this.editorVersion;
	}

	async previewCandidate(code: string, baseline: string, revision: number): Promise<boolean> {
		if (
			this.isExecutionLocked() ||
			this.candidateInFlight ||
			this.editorVersion !== revision ||
			this.deps.editor.getValue() !== baseline
		)
			return false;
		this.candidateInFlight = true;
		try {
			const ready = await this.deps.runtime.tryCandidate(code, baseline);
			if (!ready || this.editorVersion !== revision || this.deps.editor.getValue() !== baseline) {
				if (this.deps.editor.getValue() === baseline) this.deps.runtime.forceRun(baseline);
				return false;
			}
			this.preview = { code, baseline, version: revision };
			return true;
		} finally {
			this.candidateInFlight = false;
		}
	}

	acceptPreviewedCandidate(): boolean {
		const preview = this.preview;
		if (
			!preview ||
			this.isExecutionLocked() ||
			this.editorVersion !== preview.version ||
			this.deps.editor.getValue() !== preview.baseline
		)
			return false;
		this.preview = null;
		this.cancelPendingWorkingCode();
		this.replaceCode(preview.code);
		this.callbacks.onSaveCode(preview.code);
		this.deps.state.setLastWorkingCode(preview.code);
		this.deps.state.clearError();
		this.deps.editor.clearMarkers();
		return true;
	}

	restoreAcceptedCode(): void {
		const preview = this.preview;
		this.preview = null;
		if (preview) this.deps.runtime.forceRun(preview.baseline);
	}

	setCodeSilently(code: string): void {
		this.preview = null;
		this.replaceCode(code);
	}

	handleRevertToLastWorking(): void {
		const lastWorkingCode = this.deps.state.getLastWorkingCode();
		if (lastWorkingCode) this.replaceAndRun(lastWorkingCode);
	}

	handleHardReset(): void {
		if (this.isExecutionLocked()) return;
		this.execute(this.deps.editor.getValue(), 'reset-runtime');
	}

	handleRunOk(code: string): void {
		this.setPendingWorkingCode(code);

		this.deps.state.clearError();
		this.deps.editor.clearMarkers();
	}

	handleExecutionError(error: CodeError): void {
		this.cancelPendingWorkingCode();
		this.deps.state.setError(error);
		this.deps.editor.setErrorMarker(error);
	}

	private execute(code: string, mode: 'run' | 'reset-runtime', persist = true): void {
		this.clearDebounce();
		if (persist) this.callbacks.onSaveCode(code);
		this.deps.state.clearError();
		this.deps.editor.clearMarkers();

		if (mode === 'reset-runtime') {
			this.deps.runtime.resetRuntime(code);
		} else {
			this.deps.runtime.forceRun(code);
		}
	}

	private replaceCode(code: string): void {
		this.editorVersion += 1;
		this.deps.editor.setValue(code, { silent: true });
		this.deps.onCodeChanged(code);
	}

	private clearDebounce(): void {
		if (this.debounceTimer === null) return;
		window.clearTimeout(this.debounceTimer);
		this.debounceTimer = null;
	}

	private setPendingWorkingCode(code: string): void {
		this.clearConfirmationTimer();

		this.pendingWorkingCode = code;

		this.confirmationTimer = window.setTimeout(() => {
			this.confirmationTimer = null;
			const pending = this.pendingWorkingCode;
			if (!pending) return;
			this.deps.state.setLastWorkingCode(pending);
			this.pendingWorkingCode = null;
		}, CONFIRMATION_DELAY_MS);
	}

	private cancelPendingWorkingCode(): void {
		this.clearConfirmationTimer();
		this.pendingWorkingCode = null;
	}

	private clearConfirmationTimer(): void {
		if (this.confirmationTimer === null) return;
		window.clearTimeout(this.confirmationTimer);
		this.confirmationTimer = null;
	}

	private isExecutionLocked(): boolean {
		return this.deps.isExecutionLocked();
	}
}
