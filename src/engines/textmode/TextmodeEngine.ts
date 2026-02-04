import type { EngineContext } from '@/types/engine.types';
import type { Example } from '@/types/examples.types';
import type { AudioData } from '@/services/AudioService';
import { TextmodeEditor, type TextmodeEditorOptions } from './editor/TextmodeEditor';
import { TextmodeRuntime } from './runtime/host/TextmodeRuntime';
import { defaultTextmodeSketch } from './defaultSketch';
import { examples } from './examples';
import { TextmodeController, type TextmodeControllerDependencies } from './TextmodeController';
import type { BaseControllerCallbacks } from '@/core/controller/BaseController';

/**
 * Textmode engine for visual live coding with textmode.js.
 */
export class TextmodeEngine {
	readonly id = 'textmode';
	readonly displayName = 'textmode.js';
	readonly description = 'Visual live coding with ASCII/text-based graphics';

	private editor: TextmodeEditor | null = null;
	private runtime: TextmodeRuntime | null = null;
	private controller: TextmodeController | null = null;
	private initialized = false;

	async init(context: EngineContext): Promise<void> {
		if (this.initialized) return;

		const initialCode = context.getInitialCode();

		this.editor = this.createEditor(context, initialCode);
		this.runtime = this.createRuntime(context);
		this.controller = this.createController(context);

		this.runtime.init();
		this.initialized = true;
	}

	dispose(): void {
		if (!this.initialized) return;

		this.controller = null;
		this.runtime?.dispose();
		this.runtime = null;
		this.editor?.dispose();
		this.editor = null;
		this.initialized = false;
	}

	getEditor(): TextmodeEditor | null {
		return this.editor;
	}

	getController(): TextmodeController | null {
		return this.controller;
	}

	getRuntime(): TextmodeRuntime | null {
		return this.runtime;
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	getDefaultCode(): string {
		return defaultTextmodeSketch;
	}

	getExamples(): Record<string, Example[]> {
		return examples;
	}

	getCode(): string {
		return this.editor?.getValue() ?? '';
	}

	setCode(code: string): void {
		this.editor?.setValue(code);
	}

	/**
	 * Send audio data to the runtime for audio-reactive visuals.
	 */
	sendAudioData(data: AudioData): void {
		this.runtime?.sendAudioData(data);
	}

	private createEditor(context: EngineContext, initialCode: string): TextmodeEditor {
		const options: TextmodeEditorOptions = {
			container: context.editorContainer,
			initialValue: initialCode,
			fontSize: context.getSettings().fontSize,
			lineNumbers: context.getSettings().lineNumbers,
			onChange: (value) => this.controller?.handleCodeChange(value),
			onRun: () => this.controller?.handleForceRun(),
			onSoftReset: () => this.controller?.handleSoftReset(),
			onToggleUI: () => context.toggleUI(),
			onIncreaseFontSize: () => {
				context.changeFontSize(1);
			},
			onDecreaseFontSize: () => {
				context.changeFontSize(-1);
			},
		};
		return new TextmodeEditor(options);
	}

	private createRuntime(context: EngineContext): TextmodeRuntime {
		this.runtime = new TextmodeRuntime({
			container: context.visualContainer ?? document.body,
			runnerUrl: '/src/plugins/textmode/runner/index.html',
			onReady: () => this.controller?.handleRuntimeReady(),
			onRunOk: () => this.controller?.handleRunOk(),
			onRunError: (error) => this.controller?.handleRunError(error),
			onSynthError: (error) => this.controller?.handleSynthError(error),
			onToggleUI: () => context.toggleUI(),
		});
		return this.runtime;
	}

	private createController(context: EngineContext): TextmodeController {
		const callbacks: BaseControllerCallbacks = {
			onRenderOverlay: context.callbacks.onRenderOverlay,
			onSaveCode: context.callbacks.onSaveCode,
		};

		const deps: TextmodeControllerDependencies = {
			getEditor: () => this.editor,
			getRuntime: () => this.runtime,
			getAutoExecute: () => context.getSettings().autoExecute,
			getAutoExecuteDelay: () => context.getSettings().autoExecuteDelay,
		};

		return new TextmodeController(callbacks, deps);
	}
}
