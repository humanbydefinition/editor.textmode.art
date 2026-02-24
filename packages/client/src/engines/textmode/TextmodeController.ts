import { TextmodeRuntime } from './runtime/TextmodeRuntime';
import type { TextmodeEditor } from './editor/TextmodeEditor';
import type { CodeError } from '@/core/app.types';
import { BaseController, type BaseControllerCallbacks, type BaseControllerDependencies, type IController } from '@/core/BaseController';

/**
 * Textmode-specific dependencies.
 */
export interface TextmodeControllerDependencies extends BaseControllerDependencies<TextmodeEditor, TextmodeRuntime> { } /* eslint-disable-line @typescript-eslint/no-empty-object-type */

/**
 * Textmode controller interface.
 */
export interface ITextmodeController extends IController {
	handleSoftReset(): void;
	handleRunOk(): void;
	handleRunError(error: CodeError): void;
	handleSynthError(error: CodeError): void;
}

/**
 * Handles textmode-specific code execution and runtime events.
 */
export class TextmodeController extends BaseController<TextmodeEditor, TextmodeRuntime> implements ITextmodeController {
	// Engine ID for generic state management
	protected readonly engineId = 'textmode';

	constructor(callbacks: BaseControllerCallbacks, deps: TextmodeControllerDependencies) {
		super(callbacks, deps);
	}

	/**
	 * Force execute code immediately.
	 * This is the only truly required override.
	 */
	protected forceExecute(code: string): void {
		this.deps.getRuntime()?.forceRun(code);
	}

	/**
	 * Handle soft reset (Ctrl+Shift+R).
	 * Resets frame count and re-runs code.
	 */
	handleSoftReset(): void {
		if (this.isExecutionLocked()) return;
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';

		this.callbacks.onSaveCode(code);
		this.deps.store.setError(null);
		this.deps.store.setStatus('ready');
		editor?.clearMarkers();
		this.deps.getRuntime()?.softReset(code);
		this.callbacks.onRenderOverlay();
	}

	/**
	 * Handle runtime ready signal.
	 * Sets status and auto-runs initial code.
	 */
	handleRuntimeReady(): void {
		this.deps.store.setStatus('ready');
		this.deps.store.setEngineInitialized(this.engineId, true);
		this.callbacks.onRenderOverlay();

		// Auto-run initial code
		if (this.isExecutionLocked()) return;
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';
		if (code) {
			this.deps.getRuntime()?.forceRun(code);
		}
	}

	/**
	 * Handle successful code execution.
	 * Confirms working code and updates status.
	 */
	handleRunOk(): void {
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';

		// Start pending working code confirmation (uses BaseController default)
		this.setPendingWorkingCode(code);

		this.deps.store.setStatus('running');
		this.deps.store.setError(null);
		editor?.clearMarkers();
		this.callbacks.onRenderOverlay();
	}

	/**
	 * Handle code execution error.
	 * Delegates to base handleError with status update.
	 */
	handleRunError(error: CodeError): void {
		this.deps.store.setStatus('error');
		this.handleError(error);
	}

	/**
	 * Override: Format error message with [textmode] prefix.
	 */
	protected override formatErrorMessage(message: string): string {
		return `[textmode] ${message}`;
	}

	/**
	 * Handle synth dynamic parameter error.
	 * These errors don't affect code execution status.
	 */
	handleSynthError(error: CodeError): void {
		this.cancelPendingWorkingCode();
		this.deps.store.setStatus('error');
		this.deps.store.setError({
			...error,
			message: this.formatErrorMessage(error.message),
			source: 'textmode',
		});
		this.callbacks.onRenderOverlay();
	}
}
