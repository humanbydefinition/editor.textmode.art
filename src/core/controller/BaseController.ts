import { useAppStore } from '@/stores/appStore';
import type { CodeError } from '@/types/app.types';
import type { IEditor } from '../editor/BaseEditor';

/**
 * Base runtime interface - shared methods expected by BaseController.
 */
export interface IBaseRuntime {
	/** Run code immediately without debounce */
	forceRun(code: string): void;
}

/**
 * Controller interface for editor + runtime coordination.
 */
export interface IController {
	handleCodeChange(code: string): void;
	handleForceRun(): void;
	handleRevertToLastWorking(): void;
	handleError(error: CodeError): void;
}

/**
 * Base callbacks shared by all controllers.
 */
export interface BaseControllerCallbacks {
	/** Called when overlay needs re-rendering */
	onRenderOverlay: () => void;
	/** Called to save code to storage */
	onSaveCode: (code: string) => void;
}

/**
 * Base dependencies shared by all controllers.
 * Generic over editor and runtime types.
 */
export interface BaseControllerDependencies<TEditor extends IEditor, TRuntime extends IBaseRuntime> {
	/** Get editor instance (may be null during init) */
	getEditor: () => TEditor | null;
	/** Get runtime instance (may be null during init) */
	getRuntime: () => TRuntime | null;
	/** Get current auto-execute setting */
	getAutoExecute: () => boolean;
	/** Get current auto-execute delay in ms */
	getAutoExecuteDelay: () => number;
}

/**
 * Abstract base controller with shared functionality.
 * Provides shared functionality for debouncing, code execution, error handling, and revert.
 *
 * @template TEditor - The editor type (must implement IEditor)
 * @template TRuntime - The runtime type (must implement IBaseRuntime)
 */
export abstract class BaseController<TEditor extends IEditor, TRuntime extends IBaseRuntime> implements IController {
	protected readonly callbacks: BaseControllerCallbacks;
	protected readonly deps: BaseControllerDependencies<TEditor, TRuntime>;
	protected debounceTimer: number | null = null;

	/**
	 * Unique identifier for this controller's engine.
	 * Used for generic state management in AppState.
	 */
	protected abstract readonly engineId: string;

	/**
	 * Source identifier for errors.
	 * Defaults to engineId but can be overridden for display purposes.
	 */
	protected get errorSource(): string {
		return this.engineId;
	}

	constructor(callbacks: BaseControllerCallbacks, deps: BaseControllerDependencies<TEditor, TRuntime>) {
		this.callbacks = callbacks;
		this.deps = deps;
	}

	/**
	 * Handle code change with debouncing.
	 * Saves code and optionally schedules execution based on auto-execute setting.
	 */
	handleCodeChange(code: string): void {
		this.callbacks.onSaveCode(code);
		this.clearDebounce();

		if (this.shouldAutoExecute()) {
			this.debounceTimer = window.setTimeout(() => {
				this.deps.getRuntime()?.forceRun(code);
				this.debounceTimer = null;
			}, this.deps.getAutoExecuteDelay());
		}
	}

	/**
	 * Handle forced run (Ctrl+Enter).
	 * Clears errors and immediately executes code.
	 */
	handleForceRun(): void {
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';

		this.callbacks.onSaveCode(code);
		useAppStore.getState().setError(null);
		editor?.clearMarkers();

		this.forceExecute(code);
		this.callbacks.onRenderOverlay();
	}

	/**
	 * Handle revert to last working code.
	 * Restores previous working code and re-executes.
	 */
	handleRevertToLastWorking(): void {
		const lastWorkingCode = this.getLastWorkingCode();
		if (!lastWorkingCode) return;

		const editor = this.deps.getEditor();
		editor?.setValue(lastWorkingCode);
		this.callbacks.onSaveCode(lastWorkingCode);
		useAppStore.getState().setError(null);
		editor?.clearMarkers();

		this.revertExecute(lastWorkingCode);
		this.callbacks.onRenderOverlay();
	}

	/**
	 * Handle runtime error.
	 * Sets error state and creates editor markers.
	 */
	handleError(error: CodeError): void {
		this.cancelPendingWorkingCode();

		const errorInfo: CodeError = {
			message: this.formatErrorMessage(error.message),
			stack: error.stack,
			line: error.line,
			column: error.column,
			source: this.errorSource,
		};

		useAppStore.getState().setError(errorInfo);

		this.callbacks.onRenderOverlay();
	}

	/**
	 * Clear pending debounce timer.
	 */
	protected clearDebounce(): void {
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	/**
	 * Check if auto-execute should run.
	 * Can be overridden by subclasses for additional conditions.
	 */
	protected shouldAutoExecute(): boolean {
		return this.deps.getAutoExecute();
	}

	/**
	 * Execute code after revert. Defaults to forceExecute.
	 * Can be overridden for custom revert behavior.
	 */
	protected revertExecute(code: string): void {
		this.forceExecute(code);
	}

	/**
	 * Get last working code for this controller.
	 * Default implementation uses generic engine state.
	 */
	protected getLastWorkingCode(): string | null {
		return useAppStore.getState().engineStates.get(this.engineId)?.lastWorkingCode ?? null;
	}

	/**
	 * Set pending working code confirmation.
	 * Default implementation uses generic engine state.
	 */
	protected setPendingWorkingCode(code: string): void {
		useAppStore.getState().setEnginePendingWorkingCode(this.engineId, code);
	}

	/**
	 * Cancel any pending working code confirmation.
	 * Default implementation uses generic engine state.
	 */
	protected cancelPendingWorkingCode(): void {
		useAppStore.getState().cancelEnginePendingWorkingCode(this.engineId);
	}

	/**
	 * Format error message.
	 * Default implementation returns message as-is.
	 * Override to add prefixes like "[strudel]".
	 */
	protected formatErrorMessage(message: string): string {
		return message;
	}

	/**
	 * Force execute code immediately.
	 * Called by handleForceRun.
	 */
	protected abstract forceExecute(code: string): void;
}
