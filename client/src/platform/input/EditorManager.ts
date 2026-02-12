import type { IEditor } from '@/core/BaseEditor';
import type { AppSettings } from '@/core/app.types';

/**
 * Manages all active editor instances.
 * Handles applying global settings to all editors.
 */
export class EditorManager {
	private editors: Map<string, IEditor> = new Map();

	/**
	 * Register a new editor.
	 */
	registerEditor(id: string, editor: IEditor): void {
		this.editors.set(id, editor);
	}

	/**
	 * Unregister an editor.
	 */
	unregisterEditor(id: string): void {
		this.editors.delete(id);
	}

	/**
	 * Get an editor by ID.
	 */
	getEditor(id: string): IEditor | undefined {
		return this.editors.get(id);
	}

	/**
	 * Apply settings to all registered editors.
	 */
	applySettings(settings: AppSettings): void {
		const editorOptions = {
			fontSize: settings.fontSize,
			lineNumbers: settings.lineNumbers ? ('on' as const) : ('off' as const),
			lineNumbersMinChars: settings.lineNumbers ? 2 : 0,
			lineDecorationsWidth: settings.lineNumbers ? 16 : 0,
		};

		const env = {
			backdrop: settings.editorBackdrop,
		};

		for (const editor of this.editors.values()) {
			editor.updateOptions(editorOptions);
			editor.updateEnvironment(env);
		}
	}

	setReadOnly(readOnly: boolean): void {
		for (const editor of this.editors.values()) {
			editor.updateOptions({ readOnly });
		}
	}

	focusEditor(id: string): void {
		this.editors.get(id)?.focus();
	}

	/**
	 * Get the ID of the editor that currently has focus.
	 */
	getFocusedEditorId(): string | null {
		for (const [id, editor] of this.editors) {
			if (editor.editor.hasTextFocus()) {
				return id;
			}
		}
		return null;
	}
}
