import type { EngineContext } from '@/types/engine.types';
import type { Example } from '@/features/examples/examples.types';
import { StrudelEditor, type StrudelEditorOptions } from './editor/StrudelEditor';
import { StrudelRuntime } from './runtime';
import { defaultStrudelSketch } from './defaultSketch';
import { examples } from './examples';
import { StrudelController, type StrudelControllerDependencies } from './StrudelController';
import type { BaseControllerCallbacks } from '@/core/controller/BaseController';
import { createControllerStoreAdapter } from '@/platform/state/adapters/controllerStoreAdapter';

/**
 * Strudel engine for audio live coding with Strudel/TidalCycles patterns.
 */
export class StrudelEngine {
	readonly id = 'strudel';
	readonly displayName = 'strudel';
	readonly description = 'Web-based environment for live coding algorithmic patterns';

	private editor: StrudelEditor | null = null;
	private runtime: StrudelRuntime | null = null;
	private controller: StrudelController | null = null;
	private readonly storeAdapter = createControllerStoreAdapter();
	private initialized = false;
	private initializing = false;

	async init(context: EngineContext): Promise<void> {
		if (this.initialized || this.initializing) return;
		this.initializing = true;

		const initialCode = context.getInitialCode();

		try {
			this.editor = this.createEditor(context, initialCode);
			this.runtime = this.createRuntime();
			this.controller = this.createController(context);

			this.initializeRuntime();
			this.initialized = true;
		} finally {
			this.initializing = false;
		}
	}

	dispose(): void {
		if (!this.initialized) return;

		this.controller?.dispose();
		this.controller = null;
		this.runtime?.dispose();
		this.runtime = null;
		this.editor?.dispose();
		this.editor = null;
		this.initialized = false;
		this.initializing = false;
	}

	getEditor(): StrudelEditor | null {
		return this.editor;
	}

	getController(): StrudelController | null {
		return this.controller;
	}

	getRuntime(): StrudelRuntime | null {
		return this.runtime;
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	getDefaultCode(): string {
		return defaultStrudelSketch;
	}

	getExamples(): Record<string, Example[]> {
		return examples;
	}

	getCode(): string {
		return this.editor?.getValue() ?? '';
	}

	setCode(code: string, options?: { silent?: boolean }): void {
		this.editor?.setValue(code, options);
	}

	/**
	 * Hush/stop audio playback.
	 */
	hush(): void {
		this.controller?.handleHush();
	}

	/**
	 * Initialize audio engine (must be triggered by user interaction).
	 */
	async initAudio(): Promise<void> {
		await this.controller?.handleInitAudio();
	}

	/**
	 * Check if audio is initialized.
	 */
	isAudioInitialized(): boolean {
		return this.runtime?.isInitialized() ?? false;
	}

	/**
	 * Check if audio is playing.
	 */
	isPlaying(): boolean {
		return this.runtime?.getIsPlaying() ?? false;
	}

	private createEditor(context: EngineContext, initialCode: string): StrudelEditor {
		const options: StrudelEditorOptions = {
			container: context.editorContainer,
			initialValue: initialCode,
			fontSize: context.getSettings().fontSize,
			lineNumbers: context.getSettings().lineNumbers,
			onChange: (value) => this.controller?.handleCodeChange(value),
			onRun: () => this.controller?.handleForceRun(),
			onToggleUI: () => context.toggleUI(),
			onIncreaseFontSize: () => {
				context.changeFontSize(1);
			},
			onDecreaseFontSize: () => {
				context.changeFontSize(-1);
			},
		};
		return new StrudelEditor(options);
	}

	private createRuntime(): StrudelRuntime {
		return new StrudelRuntime({
			onReady: () => this.controller?.handleRuntimeReady(),
			onError: (error) => this.controller?.handleError(error),
			onPatternUpdate: (pattern) => this.controller?.handlePatternUpdate(pattern),
			onPlayStateChange: (isPlaying) => this.controller?.handlePlayStateChange(isPlaying),
		});
	}

	private createController(context: EngineContext): StrudelController {
		const callbacks: BaseControllerCallbacks = {
			onRenderOverlay: context.callbacks.onRenderOverlay,
			onSaveCode: context.callbacks.onSaveCode,
		};

		const deps: StrudelControllerDependencies = {
			getEditor: () => this.editor,
			getRuntime: () => this.runtime,
			getAutoExecute: () => context.getSettings().autoExecute,
			getAutoExecuteDelay: () => context.getSettings().autoExecuteDelay,
			getPlaybackEnabled: () => context.getSettings().strudelTransport === 'playing',
			store: this.storeAdapter,
		};

		return new StrudelController(callbacks, deps);
	}

	private initializeRuntime(): void {
		// Initialize state defaults
		this.storeAdapter.setEngineCustomState(this.id, 'state', {
			isPlaying: false,
			isInitialized: false,
		});
	}
}
