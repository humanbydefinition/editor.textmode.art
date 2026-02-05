import { TextmodeRuntime } from './runtime/host/TextmodeRuntime';
import type { TextmodeEditor } from './editor/TextmodeEditor';
import type { CodeError } from '../../types/app.types';
import { BaseController, type BaseControllerCallbacks, type BaseControllerDependencies, type IController } from '@/core/controller/BaseController';
import { useAppStore } from '@/stores/appStore';

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
		useAppStore.getState().setError(null);
		useAppStore.getState().setStatus('ready');
		editor?.clearMarkers();
		this.deps.getRuntime()?.softReset(code);
		this.callbacks.onRenderOverlay();
	}

	/**
	 * Handle runtime ready signal.
	 * Sets status and auto-runs initial code.
	 */
	handleRuntimeReady(): void {
		useAppStore.getState().setStatus('ready');
		useAppStore.getState().setEngineInitialized(this.engineId, true);
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

		useAppStore.getState().setStatus('running');
		useAppStore.getState().setError(null);
		editor?.clearMarkers();
		this.callbacks.onRenderOverlay();
	}

	/**
	 * Handle code execution error.
	 * Delegates to base handleError with status update.
	 */
	handleRunError(error: CodeError): void {
		useAppStore.getState().setStatus('error');
		this.handleError(error);
	}

	/**
	 * Handle synth dynamic parameter error.
	 * These errors don't affect code execution status.
	 */
	handleSynthError(error: CodeError): void {
		this.cancelPendingWorkingCode();
		useAppStore.getState().setStatus('error');
		useAppStore.getState().setError({ ...error, source: 'textmode' });
		this.callbacks.onRenderOverlay();
	}
}
