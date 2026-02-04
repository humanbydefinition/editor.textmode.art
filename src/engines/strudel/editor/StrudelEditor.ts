import * as monaco from 'monaco-editor';
import { BaseEditor, type EditorOptions } from '@/core/editor/BaseEditor';
import { StrudelHighlighter, injectStrudelHighlightStyles, type Pattern } from './StrudelHighlighter';

export interface StrudelEditorOptions extends EditorOptions {
	onHush?: () => void;
}

// Strudel model URI - used to identify and filter diagnostics
const STRUDEL_MODEL_URI = 'file:///strudel-sketch.js';

/**
 * StrudelEditor - Monaco editor for Strudel code.
 * Handles syntax highlighting, error filtering, and Strudel-specific keybindings.
 */
export class StrudelEditor extends BaseEditor {
	readonly highlighter: StrudelHighlighter;
	private markerListener: monaco.IDisposable | null = null;

	protected override options: StrudelEditorOptions;

	constructor(options: StrudelEditorOptions) {
		super(options);
		this.options = options;

		// Inject global highlight animation styles
		injectStrudelHighlightStyles();

		// Create the highlighter for pattern visualization
		this.highlighter = new StrudelHighlighter({
			editor: this.editor,
			lookahead: 0.1,
		});

		this.registerStrudelKeybindings();
		this.setupErrorFiltering();
	}

	protected getLanguageId(): string {
		return 'javascript';
	}

	protected getMarkerOwner(): string {
		return 'strudel';
	}

	protected createModel(value: string): monaco.editor.ITextModel {
		// Create model with unique URI to avoid conflicts
		const modelUri = monaco.Uri.parse(STRUDEL_MODEL_URI);
		const model = monaco.editor.getModel(modelUri);
		if (model) {
			model.dispose();
		}
		return monaco.editor.createModel(value, this.getLanguageId(), modelUri);
	}

	private registerStrudelKeybindings(): void {


		// Ctrl/Cmd + .: Hush (stop audio) - Strudel convention
		this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
			this.options.onHush?.();
		});
	}

	private setupErrorFiltering(): void {
		// Filter out semantic validation errors for Strudel model
		this.markerListener = monaco.editor.onDidChangeMarkers((uris) => {
			for (const uri of uris) {
				if (uri.toString() === this.model.uri.toString()) {
					const allMarkers = monaco.editor.getModelMarkers({ resource: uri });

					const syntaxOnlyMarkers = allMarkers.filter((m) => {
						if (m.owner === this.getMarkerOwner()) return true;
						if (m.owner === 'javascript') {
							const code =
								typeof m.code === 'number'
									? m.code
									: typeof m.code === 'string'
										? parseInt(m.code, 10)
										: typeof m.code === 'object' && m.code
											? parseInt(m.code.value, 10)
											: 0;
							return !isNaN(code) && code < 2000;
						}
						return false;
					});

					if (syntaxOnlyMarkers.length < allMarkers.length) {
						monaco.editor.setModelMarkers(
							this.model,
							'javascript',
							syntaxOnlyMarkers.filter((m) => m.owner === 'javascript')
						);
					}
				}
			}
		});
		this.disposables.push(this.markerListener);
	}

	public setPattern(pattern: Pattern | null, getTime: () => number, getCycle: () => number): void {
		this.highlighter.setPattern(pattern, getTime, getCycle);
	}

	public startHighlighting(): void {
		this.highlighter.start();
	}

	public stopHighlighting(): void {
		this.highlighter.stop();
	}

	public override dispose(): void {
		this.highlighter.dispose();
		super.dispose();
	}
}
