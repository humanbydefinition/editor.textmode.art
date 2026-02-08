import { StrudelRuntime, type StrudelPattern } from './runtime';
import type { StrudelEditor } from './editor/StrudelEditor';
import { BaseController, type BaseControllerCallbacks, type BaseControllerDependencies, type IController } from '@/core/controller/BaseController';

/**
 * Strudel-specific dependencies.
 */
export interface StrudelControllerDependencies extends BaseControllerDependencies<StrudelEditor, StrudelRuntime> {
	getPlaybackEnabled: () => boolean;
}

/**
 * Strudel controller interface.
 */
export interface IStrudelController extends IController {
	handleHush(): void;
	handleTransportPause(): void;
	handleInitAudio(): Promise<void>;
	handleRuntimeReady(): void;
	handlePatternUpdate(pattern: StrudelPattern | null): void;
	handlePlayStateChange(isPlaying: boolean): void;
	dispose(): void;
}

/**
 * Audio playback state.
 */
export interface StrudelState {
	/** Whether audio is currently playing */
	isPlaying: boolean;
	/** Whether audio engine has been initialized (requires user interaction) */
	isInitialized: boolean;
}

/**
 * StrudelController - manages Strudel audio runtime and code evaluation.
 */
export class StrudelController extends BaseController<StrudelEditor, StrudelRuntime> implements IStrudelController {
	// Engine ID for generic state management
	protected readonly engineId = 'strudel';

	constructor(callbacks: BaseControllerCallbacks, deps: StrudelControllerDependencies) {
		super(callbacks, deps);
	}

	/**
	 * Force execute code immediately.
	 * Handles audio initialization if needed.
	 */
	protected forceExecute(code: string): void {
		if (!this.isPlaybackEnabled()) {
			this.deps.getRuntime()?.clearPendingCode();
			this.deps.getRuntime()?.hush();
			return;
		}

		const state = this.getStrudelState();
		if (!state.isInitialized) {
			this.handleInitAudio().then(() => {
				if (!this.isPlaybackEnabled()) {
					this.deps.getRuntime()?.clearPendingCode();
					this.deps.getRuntime()?.hush();
					return;
				}
				this.deps.getRuntime()?.forceRun(code);
			}).catch((error) => {
				const message = error instanceof Error ? error.message : 'Failed to initialize Strudel audio';
				this.deps.store.setError({ message: this.formatErrorMessage(message), source: this.errorSource });
				this.callbacks.onRenderOverlay();
			});
		} else {
			this.deps.getRuntime()?.forceRun(code);
		}
	}

	/**
	 * Override: Format error message with [strudel] prefix.
	 */
	protected formatErrorMessage(message: string): string {
		return `[strudel] ${message}`;
	}

	/**
	 * Handle hush (stop audio).
	 */
	handleHush(): void {
		this.clearDebounce();
		this.cancelPendingWorkingCode();
		this.deps.getRuntime()?.clearPendingCode();
		this.deps.getRuntime()?.hush();
	}

	handleTransportPause(): void {
		this.handleHush();
	}

	/**
	 * Initialize audio (must be triggered by user interaction).
	 */
	async handleInitAudio(): Promise<void> {
		const state = this.getStrudelState();
		if (state.isInitialized) return;

		await this.deps.getRuntime()?.init();
	}

	/**
	 * Handle Strudel runtime ready.
	 */
	handleRuntimeReady(): void {
		this.updateStrudelState({ isInitialized: true });
		this.deps.store.setEngineInitialized(this.engineId, true);
		this.callbacks.onRenderOverlay();
	}

	protected override shouldAutoExecute(): boolean {
		return super.shouldAutoExecute() && this.isPlaybackEnabled();
	}

	/**
	 * Handle Strudel pattern update.
	 * Clears errors and starts highlighting.
	 */
	handlePatternUpdate(pattern: StrudelPattern | null): void {
		const editor = this.deps.getEditor();
		const runtime = this.deps.getRuntime();

		// Pattern evaluated successfully, clear any errors
		editor?.clearMarkers();
		this.deps.store.setError(null);

		// Start pending working code confirmation (uses BaseController default)
		const code = editor?.getValue() ?? '';
		if (code) {
			this.setPendingWorkingCode(code);
		}

		// Update highlighting with the new pattern
		if (editor && runtime && pattern) {
			editor.setPattern(
				pattern,
				() => runtime.getTime(),
				() => runtime.getCycle()
			);
			editor.startHighlighting();
		}

		this.callbacks.onRenderOverlay();
	}

	/**
	 * Handle Strudel play state change.
	 */
	handlePlayStateChange(isPlaying: boolean): void {
		this.updateStrudelState({ isPlaying });

		if (!isPlaying) {
			this.deps.getEditor()?.stopHighlighting();
		}

		this.callbacks.onRenderOverlay();
	}

	/**
	 * Dispose listeners.
	 */
	dispose(): void {
		this.clearDebounce();
		this.cancelPendingWorkingCode();
		this.deps.getRuntime()?.clearPendingCode();
	}

	private getStrudelState(): StrudelState {
		const newState = this.deps.store.getEngineState(this.engineId)?.customState['state'] as StrudelState | undefined;
		return newState ?? {
			isPlaying: false,
			isInitialized: false,
		};
	}

	private updateStrudelState(update: Partial<StrudelState>): void {
		const current = this.getStrudelState();
		this.deps.store.setEngineCustomState(this.engineId, 'state', { ...current, ...update });
	}

	private isPlaybackEnabled(): boolean {
		return (this.deps as StrudelControllerDependencies).getPlaybackEnabled();
	}
}
