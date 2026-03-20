import { DEFAULT_SETTINGS, type AppSettings } from '@/core/app.types';

const SETTINGS_STORAGE_KEY = 'app_settings';
const CODE_STORAGE_KEY = 'textmode_code';

export interface IEditorStorage {
	setDefaultCode(code: string): void;
	loadCode(): string;
	saveCode(code: string): void;
	clearCode(): void;
	loadSettings(): AppSettings;
	saveSettings(settings: AppSettings): void;
}

export class EditorStorage implements IEditorStorage {
	private defaultCode = '';

	setDefaultCode(code: string): void {
		this.defaultCode = code;
	}

	loadCode(): string {
		const storedCode = localStorage.getItem(CODE_STORAGE_KEY);
		if (storedCode) return storedCode;

		return this.defaultCode || '// No default code found';
	}

	saveCode(code: string): void {
		localStorage.setItem(CODE_STORAGE_KEY, code);
	}

	clearCode(): void {
		localStorage.removeItem(CODE_STORAGE_KEY);
	}

	loadSettings(): AppSettings {
		try {
			const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as Partial<AppSettings>;
				return { ...DEFAULT_SETTINGS, ...parsed };
			}
		} catch {
			// Ignore parse errors, return defaults
		}
		return DEFAULT_SETTINGS;
	}

	saveSettings(settings: AppSettings): void {
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	}
}

export const editorStorage = new EditorStorage();
