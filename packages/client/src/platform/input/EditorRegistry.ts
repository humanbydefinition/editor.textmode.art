import type { IEditor } from '@/core/BaseEditor';
import type { AppSettings } from '@/core/app.types';

export class EditorRegistry {
	private editors = new Map<string, IEditor>();

	registerEditor(id: string, editor: IEditor): void {
		this.editors.set(id, editor);
	}

	unregisterEditor(id: string): void {
		this.editors.delete(id);
	}

	getEditor(id: string): IEditor | undefined {
		return this.editors.get(id);
	}

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
}
