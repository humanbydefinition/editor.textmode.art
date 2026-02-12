import type { EngineContext, IEngine } from '@/core/engine.types';
import type { AudioData } from '@/platform/audio/AudioService';
import { useAppStore } from '@/platform/state/appStore';
import { TextmodeEditor, type TextmodeEditorOptions } from './editor/TextmodeEditor';
import { TextmodeRuntime } from './runtime/host/TextmodeRuntime';
import { TextmodeController, type TextmodeControllerDependencies } from './TextmodeController';
import type { BaseControllerCallbacks } from '@/core/BaseController';
import { createControllerStoreAdapter } from '@/platform/state/adapters/controllerStoreAdapter';

/**
 * Textmode engine for visual live coding with textmode.js.
 */
export class TextmodeEngine implements IEngine {
	readonly id = 'textmode';
	readonly displayName = 'textmode.js';
	readonly description = 'Visual live coding with ASCII/text-based graphics';

	private editor: TextmodeEditor | null = null;
	private runtime: TextmodeRuntime | null = null;
	private controller: TextmodeController | null = null;
	private initialized = false;
	private initializing = false;

	async init(context: EngineContext): Promise<void> {
		if (this.initialized || this.initializing) return;
		this.initializing = true;

		const initialCode = context.getInitialCode();

		try {
			this.editor = this.createEditor(context, initialCode);
			this.runtime = this.createRuntime(context);
			this.controller = this.createController(context);

			this.runtime.init();
			this.initialized = true;
		} finally {
			this.initializing = false;
		}
	}

	dispose(): void {
		if (!this.initialized) return;

		this.controller = null;
		this.runtime?.dispose();
		this.runtime = null;
		this.editor?.dispose();
		this.editor = null;
		this.initialized = false;
		this.initializing = false;
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

	getCode(): string {
		return this.editor?.getValue() ?? '';
	}

	setCode(code: string, options?: { silent?: boolean }): void {
		this.editor?.setValue(code, options);
	}

	/**
	 * Send audio data to the runtime for audio-reactive visuals.
	 */
	sendAudioData(data: AudioData): void {
		this.runtime?.sendAudioData(data);
	}

	reconnectRuntime(): void {
		this.runtime?.reconnect();
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
			runnerUrl: getRunnerUrl(),
			onReady: () => this.controller?.handleRuntimeReady(),
			onRunOk: () => this.controller?.handleRunOk(),
			onRunError: (error) => this.controller?.handleRunError(error),
			onSynthError: (error) => this.controller?.handleSynthError(error),
			onToggleUI: () => context.toggleUI(),
			onRunnerConnected: () => {
				useAppStore.getState().setEngineCustomState('textmode', 'runnerUnavailable', false);
				useAppStore.getState().setEngineCustomState('textmode', 'runnerReconnecting', false);
			},
			onRunnerDisconnected: () => {
				useAppStore.getState().setEngineCustomState('textmode', 'runnerUnavailable', true);
				useAppStore.getState().setEngineCustomState('textmode', 'runnerReconnecting', false);
			},
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
			store: createControllerStoreAdapter(),
		};

		return new TextmodeController(callbacks, deps);
	}
}

function getRunnerUrl(): string {
	const explicit = import.meta.env.VITE_RUNNER_URL;
	if (explicit && typeof explicit === 'string' && explicit.trim().length > 0) {
		return explicit.trim();
	}
	// Use window.location.hostname to support access from other devices on the network
	return import.meta.env.DEV
		? `http://${window.location.hostname}:5174/index.html`
		: '/runner/index.html';
}
