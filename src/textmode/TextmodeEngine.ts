import type { AppSettings } from '@/types';
import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import { TextmodeEditor, type TextmodeEditorOptions } from './editor/TextmodeEditor';
import { TextmodeRuntime } from './runtime/TextmodeRuntime';
import {
	TextmodeController,
	type TextmodeControllerCallbacks,
	type TextmodeControllerDependencies,
} from './TextmodeController';

/**
 * Context provided to the engine during initialization.
 */
export interface TextmodeEngineContext {
	editorContainer: HTMLElement;
	visualContainer?: HTMLElement;
	getSettings: () => AppSettings;
	store: AppStoreAdapter;
	callbacks: TextmodeControllerCallbacks;
	getInitialCode: () => string;
	toggleUI: () => void;
	changeFontSize: (delta: number) => void;
	onRunnerConnected?: () => void;
	onRunnerDisconnected?: () => void;
}

/**
 * Textmode engine for visual live coding with textmode.js.
 */
export class TextmodeEngine {
	private editor: TextmodeEditor | null = null;
	private runtime: TextmodeRuntime | null = null;
	private controller: TextmodeController | null = null;
	private initialized = false;
	private initializing = false;

	async init(context: TextmodeEngineContext): Promise<void> {
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

		this.controller?.dispose();
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

	sendAudioData(data: { fft: Uint8Array; waveform: Uint8Array; timestamp: number }): boolean {
		return this.runtime?.sendAudioData(data) ?? false;
	}

	reconnectRuntime(): void {
		this.runtime?.reconnect();
	}

	private createEditor(context: TextmodeEngineContext, initialCode: string): TextmodeEditor {
		const options: TextmodeEditorOptions = {
			container: context.editorContainer,
			initialValue: initialCode,
			fontSize: context.getSettings().fontSize,
			lineNumbers: context.getSettings().lineNumbers,
			onChange: (value) => this.controller?.handleCodeChange(value),
			onRun: () => this.controller?.handleForceRun(),
			onSoftReset: () => this.controller?.handleSoftReset(),
		};
		return new TextmodeEditor(options);
	}

	private createRuntime(context: TextmodeEngineContext): TextmodeRuntime {
		this.runtime = new TextmodeRuntime({
			container: context.visualContainer ?? document.body,
			runnerUrl: getRunnerUrl(),
			onReady: () => this.controller?.handleRuntimeReady(),
			onRunOk: () => this.controller?.handleRunOk(),
			onRunError: (error) => this.controller?.handleRunError(error),
			onSynthError: (error) => this.controller?.handleSynthError(error),
			onToggleUI: () => context.toggleUI(),
			onRunnerConnected: () => context.onRunnerConnected?.(),
			onRunnerDisconnected: () => context.onRunnerDisconnected?.(),
		});
		return this.runtime;
	}

	private createController(context: TextmodeEngineContext): TextmodeController {
		const callbacks: TextmodeControllerCallbacks = {
			onSaveCode: context.callbacks.onSaveCode,
		};

		const deps: TextmodeControllerDependencies = {
			getEditor: () => this.editor,
			getRuntime: () => this.runtime,
			getAutoExecute: () => context.getSettings().autoExecute,
			getAutoExecuteDelay: () => context.getSettings().autoExecuteDelay,
			store: context.store,
		};

		return new TextmodeController(callbacks, deps);
	}
}

function getRunnerUrl(): string {
	const explicit = import.meta.env.VITE_RUNNER_URL;
	if (explicit && typeof explicit === 'string' && explicit.trim().length > 0) {
		return explicit.trim();
	}
	return 'https://runner.textmode.art/';
}
