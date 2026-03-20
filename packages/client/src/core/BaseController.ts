import type { CodeError, StatusState } from '@/core/app.types';
import type { IEditor } from './BaseEditor';
import type { SharePayload } from '@synth.textmode.art/contracts/share';
import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import type { SketchSummary } from '@/features/sketch-meta';

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
 * Store adapter contract used by base controllers.
 * Implemented in platform/state/adapters/controllerStoreAdapter.ts.
 */
export interface ControllerStoreAdapter {
	// Error / status
	setError: (error: CodeError | null) => void;
	clearError: () => void;
	setStatus: (status: StatusState) => void;

	// Engine state
	getLastWorkingCode: () => string | null;
	setLastWorkingCode: (code: string | null) => void;
	getPendingWorkingCode: () => string | null;
	setPendingWorkingCode: (code: string) => void;
	cancelPendingWorkingCode: () => void;
	setIsInitialized: (initialized: boolean) => void;

	// Share
	getShareState: () => { payload: SharePayload | null; consented: boolean; promptOpen: boolean };
	setSharePromptOpen: (open: boolean) => void;

	// Approved sketch
	getApprovedSketch: () => ApprovedSketch | null;
	setApprovedSketch: (sketch: ApprovedSketch | null) => void;
	getSketchSummary: () => SketchSummary | null;
	setSketchSummary: (info: SketchSummary | null) => void;
	getOriginalApprovedSketch: () => ApprovedSketch | null;
	getOriginalSketchSummary: () => SketchSummary | null;
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
	store: ControllerStoreAdapter;
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
		this.deps.store.clearError();
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
		this.deps.store.clearError();
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

		this.deps.store.setError(errorInfo);

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
		return this.deps.store.getLastWorkingCode();
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

		this.deps.store.setPendingWorkingCode(code);

		this.confirmationTimer = window.setTimeout(() => {
			this.confirmationTimer = null;
			const pending = this.deps.store.getPendingWorkingCode();
			if (pending) {
				this.deps.store.setLastWorkingCode(pending);
				this.deps.store.cancelPendingWorkingCode();
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
		this.deps.store.cancelPendingWorkingCode();
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
		const share = this.deps.store.getShareState();
		if (share.payload && !share.consented) {
			if (!share.promptOpen) {
				this.deps.store.setSharePromptOpen(true);
			}
			return true;
		}
		return false;
	}

	private clearApprovedSketchIfCustomized(code: string): void {
		const approvedSketch = this.deps.store.getApprovedSketch();
		if (approvedSketch) {
			if (code !== approvedSketch.textmodeCode) {
				this.deps.store.setApprovedSketch(null);
				this.deps.store.setSketchSummary(null);
			}
			return;
		}

		// Check if reverted code matches the original gallery sketch
		const originalSketch = this.deps.store.getOriginalApprovedSketch();
		if (originalSketch) {
			if (code === originalSketch.textmodeCode) {
				const originalSketchSummary = this.deps.store.getOriginalSketchSummary();
				this.deps.store.setApprovedSketch(originalSketch);
				if (originalSketchSummary) {
					this.deps.store.setSketchSummary(originalSketchSummary);
				}
			}
			return;
		}

		const sketchSummary = this.deps.store.getSketchSummary();
		if (!sketchSummary || sketchSummary.status !== 'PENDING') return;

		const sharedCodeForEngine = this.getSharePayloadCode(this.deps.store.getShareState().payload);
		if (sharedCodeForEngine === null) return;

		if (code !== sharedCodeForEngine) {
			this.deps.store.setSketchSummary(null);
		}
	}

	private getSharePayloadCode(payload: SharePayload | null): string | null {
		if (!payload) return null;
		return payload.code;
	}

	/**
	 * Force execute code immediately.
	 * Called by handleForceRun.
	 */
	protected abstract forceExecute(code: string): void;
}
