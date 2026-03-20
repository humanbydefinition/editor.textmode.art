import type { CodeError } from '@/core/app.types';
import type { IEditor } from './BaseEditor';
import type { SharePayload } from '@synth.textmode.art/contracts/share';
import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';

/** Delay before pending code is confirmed as 'last working' */
const CONFIRMATION_DELAY_MS = 100;

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
	/** Store adapter for state access */
	store: AppStoreAdapter;
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
	private confirmationTimer: number | null = null;

	constructor(callbacks: BaseControllerCallbacks, deps: BaseControllerDependencies<TEditor, TRuntime>) {
		this.callbacks = callbacks;
		this.deps = deps;
	}

	/**
	 * Handle code change with debouncing.
	 * Saves code and optionally schedules execution based on auto-execute setting.
	 */
	handleCodeChange(code: string): void {
		if (this.isExecutionLocked()) return;
		this.clearApprovedSketchIfCustomized(code);
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
		if (this.isExecutionLocked()) return;
		const editor = this.deps.getEditor();
		const code = editor?.getValue() ?? '';

		this.callbacks.onSaveCode(code);
		this.deps.store.engine.clearError();
		editor?.clearMarkers();

		this.forceExecute(code);
		this.callbacks.onRenderOverlay();
	}

	/**
	 * Handle revert to last working code.
	 * Restores previous working code and re-executes.
	 */
	handleRevertToLastWorking(): void {
		if (this.isExecutionLocked()) return;
		const lastWorkingCode = this.getLastWorkingCode();
		if (!lastWorkingCode) return;

		const editor = this.deps.getEditor();
		editor?.setValue(lastWorkingCode);
		this.callbacks.onSaveCode(lastWorkingCode);
		this.deps.store.engine.clearError();
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
			source: 'textmode',
		};

		this.deps.store.engine.setError(errorInfo);

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
	 */
	protected getLastWorkingCode(): string | null {
		return this.deps.store.engine.getLastWorkingCode();
	}

	/**
	 * Set pending working code confirmation.
	 * Starts a timer that promotes pending code to last working after a delay.
	 */
	protected setPendingWorkingCode(code: string): void {
		// Clear existing timer if any
		if (this.confirmationTimer !== null) {
			window.clearTimeout(this.confirmationTimer);
		}

		this.deps.store.engine.setPendingWorkingCode(code);

		this.confirmationTimer = window.setTimeout(() => {
			this.confirmationTimer = null;
			const pending = this.deps.store.engine.getPendingWorkingCode();
			if (pending) {
				this.deps.store.engine.setLastWorkingCode(pending);
				this.deps.store.engine.cancelPendingWorkingCode();
			}
		}, CONFIRMATION_DELAY_MS);
	}

	/**
	 * Cancel any pending working code confirmation.
	 * Clears both the local timer and the store state.
	 */
	protected cancelPendingWorkingCode(): void {
		if (this.confirmationTimer !== null) {
			window.clearTimeout(this.confirmationTimer);
			this.confirmationTimer = null;
		}
		this.deps.store.engine.cancelPendingWorkingCode();
	}

	/**
	 * Format error message.
	 * Default implementation returns message as-is.
	 * Override to add engine-specific prefixes when needed.
	 */
	protected formatErrorMessage(message: string): string {
		return message;
	}

	protected isExecutionLocked(): boolean {
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

	private clearApprovedSketchIfCustomized(code: string): void {
		const approvedSketch = this.deps.store.share.getApprovedSketch();
		if (approvedSketch) {
			if (code !== approvedSketch.textmodeCode) {
				this.deps.store.share.setApprovedSketch(null);
				this.deps.store.share.setSketchSummary(null);
			}
			return;
		}

		// Check if reverted code matches the original gallery sketch
		const originalSketch = this.deps.store.share.getOriginalApprovedSketch();
		if (originalSketch) {
			if (code === originalSketch.textmodeCode) {
				const originalSketchSummary = this.deps.store.share.getOriginalSketchSummary();
				this.deps.store.share.setApprovedSketch(originalSketch);
				if (originalSketchSummary) {
					this.deps.store.share.setSketchSummary(originalSketchSummary);
				}
			}
			return;
		}

		const sketchSummary = this.deps.store.share.getSketchSummary();
		if (!sketchSummary || sketchSummary.status !== 'PENDING') return;

		const sharedCodeForEngine = this.getSharePayloadCode(this.deps.store.share.getPayload());
		if (sharedCodeForEngine === null) return;

		if (code !== sharedCodeForEngine) {
			this.deps.store.share.setSketchSummary(null);
		}
	}

	private getSharePayloadCode(payload: SharePayload | null): string | null {
		if (!payload) return null;
		return payload.engines.textmode ?? null;
	}

	/**
	 * Force execute code immediately.
	 * Called by handleForceRun.
	 */
	protected abstract forceExecute(code: string): void;
}
