import * as monaco from 'monaco-editor';
import { typeDefinitions } from '../config/generatedTypes';

// Import Monaco workers
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Configure Monaco environment for web workers
self.MonacoEnvironment = {
	getWorker(_: unknown, label: string) {
		if (label === 'typescript' || label === 'javascript') {
			return new tsWorker();
		}
		return new editorWorker();
	},
};

export interface TextmodeEditorOptions {
	container: HTMLElement;
	initialValue: string;
	fontSize?: number;
	lineNumbers?: boolean;
	readOnly?: boolean;
	onChange?: (value: string) => void;
	onRun?: () => void;
	onSoftReset?: () => void;
	onToggleTextBackground?: () => void;
	onToggleAutoExecute?: () => void;
}

/**
 * TextmodeEditor - Monaco-based editor for textmode.js live coding.
 */
export class TextmodeEditor {
	readonly editor: monaco.editor.IStandaloneCodeEditor;
	private readonly model: monaco.editor.ITextModel;
	private readonly options: TextmodeEditorOptions;
	private disposables: monaco.IDisposable[] = [];
	private suppressChange = false;

	constructor(options: TextmodeEditorOptions) {
		this.options = options;
		this.model = monaco.editor.createModel(options.initialValue, 'javascript');
		this.editor = monaco.editor.create(options.container, {
			model: this.model,
			theme: 'vs-dark',
			...this.getEditorOptions(),
			readOnly: options.readOnly,
		});

		this.setupSubscriptions();
		this.registerCommonKeybindings();
		this.configureTypeScript();
		this.registerTextmodeKeybindings();
	}

	getValue(): string {
		return this.model.getValue();
	}

	setValue(value: string, options?: { silent?: boolean }): void {
		if (options?.silent) {
			this.suppressChange = true;
		}
		this.model.setValue(value);
	}

	layout(): void {
		this.editor.layout();
	}

	focus(): void {
		this.editor.focus();
	}

	updateOptions(options: monaco.editor.IEditorOptions): void {
		this.editor.updateOptions(options);
	}

	updateEnvironment(env: { backdrop: boolean }): void {
		if (env.backdrop) {
			this.options.container.classList.add('editor-backdrop');
		} else {
			this.options.container.classList.remove('editor-backdrop');
		}
	}

	setMarkers(markers: monaco.editor.IMarkerData[]): void {
		monaco.editor.setModelMarkers(this.model, 'textmode', markers);
	}

	clearMarkers(): void {
		monaco.editor.setModelMarkers(this.model, 'textmode', []);
	}

	dispose(): void {
		this.disposables.forEach((d) => d.dispose());
		this.disposables = [];
		this.model.dispose();
		this.editor.dispose();
	}

	private getEditorOptions(): monaco.editor.IStandaloneEditorConstructionOptions {
		const showLineNumbers = this.options.lineNumbers ?? false;

		return {
			minimap: { enabled: false },
			lineNumbers: showLineNumbers ? 'on' : 'off',
			glyphMargin: false,
			folding: false,
			lineDecorationsWidth: showLineNumbers ? 16 : 0,
			lineNumbersMinChars: showLineNumbers ? 2 : 0,
			overviewRulerLanes: 0,
			overviewRulerBorder: false,
			hideCursorInOverviewRuler: true,
			renderLineHighlight: 'none',
			scrollbar: {
				vertical: 'hidden',
				horizontal: 'hidden',
				useShadows: false,
			},
			stickyScroll: { enabled: false },
			guides: {
				indentation: false,
				bracketPairs: false,
				highlightActiveIndentation: false,
				bracketPairsHorizontal: false,
			},
			renderWhitespace: 'none',
			renderControlCharacters: false,
			renderLineHighlightOnlyWhenFocus: true,
			matchBrackets: 'never',
			occurrencesHighlight: 'off',
			selectionHighlight: false,
			links: true,
			colorDecorators: false,
			automaticLayout: true,
			fontSize: this.options.fontSize ?? 14,
			fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
			fontLigatures: true,
			tabSize: 2,
			insertSpaces: true,
			wordWrap: 'on',
			padding: { top: 60, bottom: 80 },
			quickSuggestions: true,
			suggestOnTriggerCharacters: true,
			acceptSuggestionOnCommitCharacter: true,
			cursorBlinking: 'smooth',
			cursorSmoothCaretAnimation: 'on',
			cursorWidth: 2,
		};
	}

	private setupSubscriptions(): void {
		const changeDisposable = this.model.onDidChangeContent(() => {
			if (this.suppressChange) {
				this.suppressChange = false;
				return;
			}
			this.options.onChange?.(this.model.getValue());
		});
		this.disposables.push(changeDisposable);
	}

	private registerCommonKeybindings(): void {
		this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
			this.options.onRun?.();
		});
	}

	private registerTextmodeKeybindings(): void {
		this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR, () => {
			this.options.onSoftReset?.();
		});
	}

	private configureTypeScript(): void {
		const tsDefaults = monaco.languages.typescript.javascriptDefaults;

		// Compiler options
		tsDefaults.setCompilerOptions({
			target: monaco.languages.typescript.ScriptTarget.ES2020,
			allowNonTsExtensions: true,
			moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
			module: monaco.languages.typescript.ModuleKind.ESNext,
			noEmit: true,
			checkJs: true,
			strict: false,
			allowJs: true,
			lib: ['es2020', 'dom'],

			// Critical for library resolution
			baseUrl: '.',
			paths: {
				'textmode.js': ['file:///node_modules/textmode.js/dist/types/index.d.ts'],
				'textmode.synth.js': ['file:///node_modules/textmode.synth.js/dist/types/index.d.ts'],
			},
		});

		// Diagnostic options
		tsDefaults.setDiagnosticsOptions({
			noSemanticValidation: false,
			noSyntaxValidation: false,
		});

		// Load all captured type files
		for (const [path, content] of Object.entries(typeDefinitions)) {
			tsDefaults.addExtraLib(content, path);
		}

		// Disable simplified mode to remove context menu items
		tsDefaults.setModeConfiguration({
			definitions: false,
			references: false,
			documentSymbols: false,
			// Keep others enabled
			completionItems: true,
			hovers: true,
			diagnostics: true,
			documentHighlights: true,
			rename: true,
			documentRangeFormattingEdits: true,
		});
	}
}
