import { StrudelRuntime, type StrudelPattern } from './runtime';
import type { StrudelEditor } from './editor/StrudelEditor';
import { useAppStore } from '@/stores/appStore';
import { BaseController, type BaseControllerCallbacks, type BaseControllerDependencies, type IController } from '@/core/controller/BaseController';

/**
 * Strudel-specific dependencies.
 */
export interface StrudelControllerDependencies extends BaseControllerDependencies<StrudelEditor, StrudelRuntime> { } /* eslint-disable-line @typescript-eslint/no-empty-object-type */

/**
 * Strudel controller interface.
 */
export interface IStrudelController extends IController {
	handleHush(): void;
	handleInitAudio(): Promise<void>;
	setupAutoAudioInit(): void;
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

	private autoInitListener: (() => void) | null = null;

	constructor(callbacks: BaseControllerCallbacks, deps: StrudelControllerDependencies) {
		super(callbacks, deps);
	}

	/**
	 * Force execute code immediately.
	 * Handles audio initialization if needed.
	 */
	protected forceExecute(code: string): void {
		const state = this.getStrudelState();
		if (!state.isInitialized) {
			this.handleInitAudio().then(() => {
				this.deps.getRuntime()?.forceRun(code);
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
		this.deps.getRuntime()?.hush();
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
	 * Setup automatic audio initialization on first user interaction.
	 * Satisfies Web Audio autoplay policy.
	 */
	setupAutoAudioInit(): void {
		const initOnInteraction = () => {
			const state = this.getStrudelState();
			if (!state.isInitialized) {
				this.handleInitAudio();
			}
			document.removeEventListener('click', initOnInteraction);
			document.removeEventListener('keydown', initOnInteraction);
			document.removeEventListener('touchstart', initOnInteraction);
		};

		this.autoInitListener = initOnInteraction;
		document.addEventListener('click', initOnInteraction);
		document.addEventListener('keydown', initOnInteraction);
		document.addEventListener('touchstart', initOnInteraction);
	}

	/**
	 * Handle Strudel runtime ready.
	 */
	handleRuntimeReady(): void {
		this.updateStrudelState({ isInitialized: true });
		useAppStore.getState().setEngineInitialized(this.engineId, true);
		this.callbacks.onRenderOverlay();
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
		const currentError = useAppStore.getState().error;
		if (currentError?.source === 'strudel') {
			useAppStore.getState().setError(null);
		}

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
		if (this.autoInitListener) {
			document.removeEventListener('click', this.autoInitListener);
			document.removeEventListener('keydown', this.autoInitListener);
			document.removeEventListener('touchstart', this.autoInitListener);
			this.autoInitListener = null;
		}
	}

	private getStrudelState(): StrudelState {
		// Use useAppStore.getState() instead of injecting appState
		const newState = useAppStore.getState().engineStates.get(this.engineId)?.customState['state'] as StrudelState | undefined;
		return newState ?? {
			isPlaying: false,
			isInitialized: false,
		};
	}

	private updateStrudelState(update: Partial<StrudelState>): void {
		const current = this.getStrudelState();
		useAppStore.getState().setEngineCustomState(this.engineId, 'state', { ...current, ...update });
	}
}
