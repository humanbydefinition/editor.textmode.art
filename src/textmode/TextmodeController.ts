import type { CodeError } from '@/types';
import type { TextmodeEditor } from './editor/TextmodeEditor';
import { TextmodeRuntime } from './runtime/TextmodeRuntime';

const CONFIRMATION_DELAY_MS = 100;

export interface TextmodeControllerCallbacks {
	onSaveCode: (code: string) => void;
}

export interface TextmodeControllerState {
	clearError: () => void;
	setError: (error: CodeError) => void;
	getLastWorkingCode: () => string | null;
	setLastWorkingCode: (code: string) => void;
}

export interface TextmodeControllerDependencies {
	getEditor: () => TextmodeEditor | null;
	getRuntime: () => TextmodeRuntime | null;
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
			this.deps.getRuntime()?.forceRun(code);
			this.debounceTimer = null;
		}, this.deps.getAutoExecuteDelay());
	}

	handleForceRun(): void {
		if (this.isExecutionLocked()) return;
		this.clearDebounce();
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';

		this.callbacks.onSaveCode(code);
		this.deps.state.clearError();
		editor?.clearMarkers();

		this.deps.getRuntime()?.forceRun(code);
	}

	handleRevertToLastWorking(): void {
		if (this.isExecutionLocked()) return;
		const lastWorkingCode = this.deps.state.getLastWorkingCode();
		if (!lastWorkingCode) return;

		const editor = this.deps.getEditor();
		editor?.setValue(lastWorkingCode);
		this.callbacks.onSaveCode(lastWorkingCode);
		this.deps.state.clearError();
		editor?.clearMarkers();

		this.deps.getRuntime()?.forceRun(lastWorkingCode);
	}

	handleHardReset(): void {
		if (this.isExecutionLocked()) return;
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';

		this.callbacks.onSaveCode(code);
		this.deps.state.clearError();
		editor?.clearMarkers();
		this.deps.getRuntime()?.restart(code);
	}

	handleRunOk(): void {
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';

		this.setPendingWorkingCode(code);

		this.deps.state.clearError();
		editor?.clearMarkers();
	}

	handleRunError(error: CodeError): void {
		this.handleError(error);
	}

	handleSynthError(error: CodeError): void {
		this.cancelPendingWorkingCode();
		const formattedError = {
			...error,
			message: this.formatErrorMessage(error.message),
			source: 'textmode',
		};

		this.deps.state.setError(formattedError);
		this.deps.getEditor()?.setErrorMarker(formattedError);
	}

	private handleError(error: CodeError): void {
		this.cancelPendingWorkingCode();
		const formattedError = {
			message: this.formatErrorMessage(error.message),
			stack: error.stack,
			line: error.line,
			column: error.column,
			source: 'textmode',
		};

		this.deps.state.setError(formattedError);
		this.deps.getEditor()?.setErrorMarker(formattedError);
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

	private formatErrorMessage(message: string): string {
		return message;
	}

	private isExecutionLocked(): boolean {
		return this.deps.isExecutionLocked();
	}
}
