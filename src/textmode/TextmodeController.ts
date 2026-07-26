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

	constructor(callbacks: TextmodeControllerCallbacks, deps: TextmodeControllerDependencies) {
		this.callbacks = callbacks;
		this.deps = deps;
	}

	dispose(): void {
		this.clearDebounce();
		this.clearConfirmationTimer();
	}

	handleCodeChange(code: string): void {
		if (this.isExecutionLocked()) return;
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

	handleRevertToLastWorking(): void {
		const lastWorkingCode = this.deps.state.getLastWorkingCode();
		if (lastWorkingCode) this.replaceAndRun(lastWorkingCode);
	}

	handleHardReset(): void {
		if (this.isExecutionLocked()) return;
		this.execute(this.deps.editor.getValue(), 'reset-runtime');
	}

	handleRunOk(): void {
		const code = this.deps.editor.getValue();

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
