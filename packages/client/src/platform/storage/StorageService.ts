
import { DEFAULT_SETTINGS, type AppSettings } from '@/core/app.types';
// Storage keys
const SETTINGS_STORAGE_KEY = 'app_settings';

/**
 * Get storage key for an engine's code.
 */
function getEngineCodeKey(engineId: string): string {
	return `${engineId}_code`;
}

/**
 * Storage service interface.
 */
export interface IStorageService {
	/** Register default code for an engine */
	registerDefaultCode(engineId: string, code: string): void;

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
	private readonly defaultCodeMap = new Map<string, string>();

	/**
	 * Register default code for an engine.
	 */
	registerDefaultCode(engineId: string, code: string): void {
		this.defaultCodeMap.set(engineId, code);
	}

	/**
	 * Load engine code.
	 * Priority: localStorage > default sketch
	 */
	loadEngineCode(engineId: string): string {
		// Check localStorage
		const storedCode = localStorage.getItem(getEngineCodeKey(engineId));
		if (storedCode) return storedCode;

		return this.defaultCodeMap.get(engineId) ?? '// No default code found for this engine';
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
		// Clear based on registered defaults
		for (const engineId of this.defaultCodeMap.keys()) {
			this.clearEngineCode(engineId);
		}
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
