import { DEFAULT_SETTINGS, type AppSettings } from '@/types/app.types';
import { defaultTextmodeSketch } from '@/engines/textmode/defaultSketch';
import { defaultStrudelSketch } from '@/engines/strudel/defaultSketch';

// Storage keys
const SETTINGS_STORAGE_KEY = 'app_settings';

/**
 * Get storage key for an engine's code.
 */
function getEngineCodeKey(engineId: string): string {
	return `${engineId}_code`;
}

const DEFAULT_CODE_BY_ENGINE: Record<string, string> = {
	textmode: defaultTextmodeSketch,
	strudel: defaultStrudelSketch,
};

/**
 * Storage service interface.
 */
export interface IStorageService {
	/** Load engine code from localStorage or default */
	loadEngineCode(engineId: string): string;

	/** Save engine code to localStorage */
	saveEngineCode(engineId: string, code: string): void;

	/** Clear engine code from localStorage */
	clearEngineCode(engineId: string): void;

	/** Clear all stored code (reset to defaults) */
	clearCode(): void;

	/** Load settings from localStorage with defaults */
	loadSettings(): AppSettings;

	/** Save settings to localStorage */
	saveSettings(settings: AppSettings): void;
}

/**
 * Storage service using localStorage.
 */
export class StorageService implements IStorageService {
	/**
	 * Load engine code.
	 * Priority: localStorage > default sketch
	 */
	loadEngineCode(engineId: string): string {
		// Check localStorage
		const storedCode = localStorage.getItem(getEngineCodeKey(engineId));
		if (storedCode) return storedCode;

		return DEFAULT_CODE_BY_ENGINE[engineId] ?? '// No default code found for this engine';
	}

	/**
	 * Save engine code to localStorage.
	 */
	saveEngineCode(engineId: string, code: string): void {
		localStorage.setItem(getEngineCodeKey(engineId), code);
	}

	/**
	 * Clear engine code from localStorage.
	 */
	clearEngineCode(engineId: string): void {
		localStorage.removeItem(getEngineCodeKey(engineId));
	}

	/**
	 * Clear all known engine code from localStorage.
	 */
	clearCode(): void {
		Object.keys(DEFAULT_CODE_BY_ENGINE).forEach((engineId) => {
			this.clearEngineCode(engineId);
		});
	}

	/**
	 * Load settings from localStorage with defaults.
	 */
	loadSettings(): AppSettings {
		try {
			const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as Partial<AppSettings>;
				delete parsed.strudelTransport;
				return {
					...DEFAULT_SETTINGS,
					...parsed,
					// Transport is runtime-only and must start paused on each page load.
					strudelTransport: DEFAULT_SETTINGS.strudelTransport,
				};
			}
		} catch {
			// Ignore parse errors, return defaults
		}
		return DEFAULT_SETTINGS;
	}

	/**
	 * Save settings to localStorage.
	 */
	saveSettings(settings: AppSettings): void {
		const persisted: Partial<AppSettings> = { ...settings };
		delete persisted.strudelTransport;
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(persisted));
	}
}

/**
 * Singleton instance.
 */
export const storageService = new StorageService();
