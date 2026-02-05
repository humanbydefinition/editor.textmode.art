import * as monaco from 'monaco-editor';
import { BaseEditor, type EditorOptions } from '@/core/editor/BaseEditor';
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

export interface TextmodeEditorOptions extends EditorOptions {
	onSoftReset?: () => void;
	onToggleTextBackground?: () => void;
	onToggleAutoExecute?: () => void;
}

/**
 * TextmodeEditor - Monaco-based editor for textmode.js live coding.
 */
export class TextmodeEditor extends BaseEditor {
	protected override options: TextmodeEditorOptions;

	constructor(options: TextmodeEditorOptions) {
		super(options);
		this.options = options;
		this.configureTypeScript();
		this.registerTextmodeKeybindings();
	}

	protected getLanguageId(): string {
		return 'javascript';
	}

	protected getMarkerOwner(): string {
		return 'textmode';
	}

	private registerTextmodeKeybindings(): void {
		// Ctrl/Cmd + Shift + R: Soft reset
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
