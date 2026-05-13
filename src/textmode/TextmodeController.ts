import type { CodeError } from '@/types';
import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { TextmodeEditor } from './editor/TextmodeEditor';
import { TextmodeRuntime } from './runtime/TextmodeRuntime';

const CONFIRMATION_DELAY_MS = 100;

export interface TextmodeControllerCallbacks {
	onSaveCode: (code: string) => void;
}

export interface TextmodeControllerDependencies {
	getEditor: () => TextmodeEditor | null;
	getRuntime: () => TextmodeRuntime | null;
	getAutoExecute: () => boolean;
	getAutoExecuteDelay: () => number;
	store: AppStoreAdapter;
}

/**
 * Handles textmode code execution, runtime events, debouncing, and revert flow.
 */
export class TextmodeController {
	private readonly callbacks: TextmodeControllerCallbacks;
	private readonly deps: TextmodeControllerDependencies;
	private debounceTimer: number | null = null;
	private confirmationTimer: number | null = null;

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
		this.deps.store.engine.clearError();
		editor?.clearMarkers();

		this.deps.getRuntime()?.forceRun(code);
	}

	handleRevertToLastWorking(): void {
		if (this.isExecutionLocked()) return;
		const lastWorkingCode = this.deps.store.engine.getLastWorkingCode();
		if (!lastWorkingCode) return;

		const editor = this.deps.getEditor();
		editor?.setValue(lastWorkingCode);
		this.callbacks.onSaveCode(lastWorkingCode);
		this.deps.store.engine.clearError();
		editor?.clearMarkers();

		this.deps.getRuntime()?.forceRun(lastWorkingCode);
	}

	handleSoftReset(): void {
		if (this.isExecutionLocked()) return;
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';

		this.callbacks.onSaveCode(code);
		this.deps.store.engine.clearError();
		this.deps.store.engine.setStatus('ready');
		editor?.clearMarkers();
		this.deps.getRuntime()?.softReset(code);
	}

	handleRuntimeReady(): void {
		this.deps.store.engine.setStatus('ready');
		this.deps.store.engine.setIsInitialized(true);

		if (this.isExecutionLocked()) return;
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';
		if (code) {
			this.deps.getRuntime()?.forceRun(code);
		}
	}

	handleRunOk(): void {
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';

		this.setPendingWorkingCode(code);

		this.deps.store.engine.setStatus('running');
		this.deps.store.engine.clearError();
		editor?.clearMarkers();
	}

	handleRunError(error: CodeError): void {
		this.deps.store.engine.setStatus('error');
		this.handleError(error);
	}

	handleSynthError(error: CodeError): void {
		this.cancelPendingWorkingCode();
		const formattedError = {
			...error,
			message: this.formatErrorMessage(error.message),
			source: 'textmode',
		};

		this.deps.store.engine.setStatus('error');
		this.deps.store.engine.setError(formattedError);
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

		this.deps.store.engine.setError(formattedError);
		this.deps.getEditor()?.setErrorMarker(formattedError);
	}

	private clearDebounce(): void {
		if (this.debounceTimer === null) return;
		window.clearTimeout(this.debounceTimer);
		this.debounceTimer = null;
	}

	private setPendingWorkingCode(code: string): void {
		this.clearConfirmationTimer();

		this.deps.store.engine.setPendingWorkingCode(code);

		this.confirmationTimer = window.setTimeout(() => {
			this.confirmationTimer = null;
			const pending = this.deps.store.engine.getPendingWorkingCode();
			if (!pending) return;
			this.deps.store.engine.setLastWorkingCode(pending);
			this.deps.store.engine.cancelPendingWorkingCode();
		}, CONFIRMATION_DELAY_MS);
	}

	private cancelPendingWorkingCode(): void {
		this.clearConfirmationTimer();
		this.deps.store.engine.cancelPendingWorkingCode();
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
		const payload = this.deps.store.share.getPayload();
		const consented = this.deps.store.share.getConsented();
		const promptOpen = this.deps.store.share.getPromptOpen();
		if (payload && !consented) {
			if (!promptOpen) {
				this.deps.store.share.setPromptOpen(true);
			}
			return true;
		}
		return false;
	}

}
