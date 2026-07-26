import type { AppSettings } from '@/types';
import { TextmodeEditor, type TextmodeEditorOptions } from './editor/TextmodeEditor';
import { TextmodeRuntime } from './runtime/TextmodeRuntime';
import {
	TextmodeController,
	type TextmodeControllerCallbacks,
	type TextmodeControllerDependencies,
	type TextmodeControllerState,
} from './TextmodeController';

/**
 * Context provided to the engine during initialization.
 */
export interface TextmodeEngineContext {
	editorContainer: HTMLElement;
	visualContainer?: HTMLElement;
	getSettings: () => AppSettings;
	controllerState: TextmodeControllerState;
	isExecutionLocked: () => boolean;
	onCodeChanged: (code: string) => void;
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

	init(context: TextmodeEngineContext): void {
		if (this.initialized) return;

		const initialCode = context.getInitialCode();
		const editor = this.createEditor(context, initialCode);
		const runtime = this.createRuntime(context);
		const controller = this.createController(context, editor, runtime);

		this.editor = editor;
		this.runtime = runtime;
		this.controller = controller;

		runtime.init(context.isExecutionLocked() ? '' : initialCode);
		this.initialized = true;
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
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	run(): void {
		this.controller?.handleForceRun();
	}

	replaceAndRun(code: string, reason: 'run' | 'reset-runtime' = 'run'): void {
		this.controller?.replaceAndRun(code, reason);
	}

	resetRuntime(): void {
		this.controller?.handleHardReset();
	}

	revertToLastWorking(): void {
		this.controller?.handleRevertToLastWorking();
	}

	getCode(): string {
		return this.editor?.getValue() ?? '';
	}

	setCode(code: string, options?: { silent?: boolean }): void {
		this.editor?.setValue(code, options);
	}

	updateSettings(settings: Pick<AppSettings, 'fontSize' | 'lineNumbers'>): void {
		this.editor?.updateOptions({
			fontSize: settings.fontSize,
			lineNumbers: settings.lineNumbers ? 'on' : 'off',
			lineNumbersMinChars: settings.lineNumbers ? 2 : 0,
			lineDecorationsWidth: settings.lineNumbers ? 16 : 0,
		});
	}

	setReadOnly(readOnly: boolean): void {
		this.editor?.updateOptions({ readOnly });
	}

	focus(): void {
		this.editor?.focus();
	}

	sendAudioData(data: { fft: Uint8Array; waveform: Uint8Array; timestamp: number }): boolean {
		return this.runtime?.sendAudioData(data) ?? false;
	}

	reloadSandbox(code = this.getCode()): void {
		this.runtime?.reloadSandbox(code);
	}

	private createEditor(context: TextmodeEngineContext, initialCode: string): TextmodeEditor {
		const options: TextmodeEditorOptions = {
			container: context.editorContainer,
			initialValue: initialCode,
			fontSize: context.getSettings().fontSize,
			lineNumbers: context.getSettings().lineNumbers,
			onChange: (value) => this.controller?.handleCodeChange(value),
			onRun: () => this.controller?.handleForceRun(),
		};
		return new TextmodeEditor(options);
	}

	private createRuntime(context: TextmodeEngineContext): TextmodeRuntime {
		return new TextmodeRuntime({
			container: context.visualContainer ?? document.body,
			runnerUrl: getRunnerUrl(),
			onRunOk: () => this.controller?.handleRunOk(),
			onRunError: (error) => this.controller?.handleExecutionError(error),
			onSynthError: (error) => this.controller?.handleExecutionError(error),
			onHardReset: () => this.controller?.handleHardReset(),
			onToggleUI: () => context.toggleUI(),
			onRunnerConnected: () => context.onRunnerConnected?.(),
			onRunnerDisconnected: () => context.onRunnerDisconnected?.(),
		});
	}

	private createController(
		context: TextmodeEngineContext,
		editor: TextmodeEditor,
		runtime: TextmodeRuntime
	): TextmodeController {
		const deps: TextmodeControllerDependencies = {
			editor,
			runtime,
			getAutoExecute: () => context.getSettings().autoExecute,
			getAutoExecuteDelay: () => context.getSettings().autoExecuteDelay,
			state: context.controllerState,
			isExecutionLocked: context.isExecutionLocked,
			onCodeChanged: context.onCodeChanged,
		};

		return new TextmodeController(context.callbacks, deps);
	}
}

function getRunnerUrl(): string {
	const explicit = import.meta.env.VITE_RUNNER_URL;
	if (explicit && typeof explicit === 'string' && explicit.trim().length > 0) {
		return explicit.trim();
	}
	return import.meta.env.DEV
		? `${window.location.protocol}//${window.location.hostname}:5181/`
		: 'https://runner.textmode.art/';
}
