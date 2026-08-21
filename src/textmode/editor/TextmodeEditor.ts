import * as monaco from 'monaco-editor';
import { typeDefinitions } from '../config/generated/editorTypes';

// Import Monaco workers
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker';

// Configure Monaco environment for web workers
(self as typeof globalThis & { MonacoEnvironment?: monaco.Environment }).MonacoEnvironment = {
	getWorker(_: unknown, label: string) {
		if (label === 'typescript' || label === 'javascript') {
			return new tsWorker();
		}
		return new editorWorker();
	},
};

const editorThemeName = 'textmode-dark';

// Monaco theme colors cannot resolve CSS variables. These states mirror --primary
// (#4BA3F7), with stronger fills and borders reserved for the active match.
monaco.editor.defineTheme(editorThemeName, {
	base: 'vs-dark',
	inherit: true,
	rules: [],
	colors: {
		'editorBracketMatch.background': '#4BA3F733',
		'editorBracketMatch.border': '#9ACEFF',
		'editor.wordHighlightBackground': '#4BA3F733',
		'editor.wordHighlightBorder': '#4BA3F780',
		'editor.wordHighlightStrongBackground': '#4BA3F74D',
		'editor.wordHighlightStrongBorder': '#9ACEFFB3',
		'editor.wordHighlightTextBackground': '#4BA3F733',
		'editor.wordHighlightTextBorder': '#4BA3F780',
		'editor.selectionHighlightBackground': '#4BA3F733',
		'editor.selectionHighlightBorder': '#4BA3F780',
		'editor.findMatchBackground': '#4BA3F799',
		'editor.findMatchBorder': '#D8ECFF',
		'editor.findMatchHighlightBackground': '#4BA3F752',
		'editor.findMatchHighlightBorder': '#9ACEFFCC',
		'editor.findRangeHighlightBackground': '#4BA3F726',
		'editor.findRangeHighlightBorder': '#4BA3F766',
	},
});

export interface TextmodeEditorOptions {
	container: HTMLElement;
	initialValue: string;
	fontSize?: number;
	lineNumbers?: boolean;
	readOnly?: boolean;
	onChange?: (value: string) => void;
	onRun?: () => void;
}

/**
 * TextmodeEditor - Monaco-based editor for textmode.js live coding.
 */
export class TextmodeEditor {
	private readonly editor: monaco.editor.IStandaloneCodeEditor;
	private readonly model: monaco.editor.ITextModel;
	private readonly options: TextmodeEditorOptions;
	private disposables: monaco.IDisposable[] = [];
	private suppressChange = false;

	constructor(options: TextmodeEditorOptions) {
		this.options = options;
		this.model = monaco.editor.createModel(options.initialValue, 'javascript');
		this.editor = monaco.editor.create(options.container, {
			model: this.model,
			theme: editorThemeName,
			...this.getEditorOptions(),
			readOnly: options.readOnly,
		});

		this.setupSubscriptions();
		this.registerCommonKeybindings();
		this.configureTypeScript();
	}

	getValue(): string {
		return this.model.getValue();
	}

	setValue(value: string, options?: { silent?: boolean }): void {
		if (options?.silent && this.model.getValue() === value) return;

		if (options?.silent) {
			this.suppressChange = true;
		}
		this.model.setValue(value);
	}

	focus(): void {
		this.editor.focus();
	}

	updateOptions(options: monaco.editor.IEditorOptions): void {
		this.editor.updateOptions(options);
	}

	private setMarkers(markers: monaco.editor.IMarkerData[]): void {
		monaco.editor.setModelMarkers(this.model, 'textmode', markers);
	}

	setErrorMarker(error: { message: string; line?: number; column?: number }): void {
		if (!Number.isFinite(error.line)) {
			this.clearMarkers();
			return;
		}

		const lineNumber = Math.min(this.model.getLineCount(), Math.max(1, Math.floor(error.line ?? 1)));
		const maxColumn = this.model.getLineMaxColumn(lineNumber);
		const startColumn = Math.min(maxColumn, Math.max(1, Math.floor(error.column ?? 1)));

		this.setMarkers([
			{
				severity: monaco.MarkerSeverity.Error,
				message: error.message,
				startLineNumber: lineNumber,
				startColumn,
				endLineNumber: lineNumber,
				endColumn: Math.min(maxColumn, startColumn + 1),
			},
		]);
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
			matchBrackets: 'near',
			occurrencesHighlight: 'singleFile',
			selectionHighlight: true,
			links: true,
			colorDecorators: true,
			defaultColorDecorators: 'always',
			colorDecoratorsActivatedOn: 'click',
			colorDecoratorsLimit: 500,
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

	private configureTypeScript(): void {
		const tsDefaults = monaco.typescript.javascriptDefaults;

		// Compiler options
		tsDefaults.setCompilerOptions({
			target: monaco.typescript.ScriptTarget.ES2020,
			allowNonTsExtensions: true,
			moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
			module: monaco.typescript.ModuleKind.ESNext,
			noEmit: true,
			checkJs: true,
			strict: false,
			allowJs: true,
			lib: ['es2020', 'dom'],

			// Critical for library resolution
			baseUrl: '.',
			paths: {
				'textmode.js': ['file:///node_modules/textmode.js/dist/types/index.d.ts'],
				'textmode.js/addon': ['file:///node_modules/textmode.js/dist/types/exports/addon.d.ts'],
				'textmode.synth.js': ['file:///node_modules/textmode.synth.js/dist/types/index.d.ts'],
				'textmode.filters.js': ['file:///node_modules/textmode.filters.js/dist/types/index.d.ts'],
				'textmode.export.js': ['file:///node_modules/textmode.export.js/dist/types/index.d.ts'],
				'textmode.figlet.js': ['file:///node_modules/textmode.figlet.js/dist/types/index.d.ts'],
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
