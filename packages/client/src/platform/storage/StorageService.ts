
import { DEFAULT_SETTINGS, type AppSettings } from '@/core/app.types';

// Storage keys
const SETTINGS_STORAGE_KEY = 'app_settings';
// Keep 'textmode_code' key for backward compatibility with existing user data
const CODE_STORAGE_KEY = 'textmode_code';

/**
 * Storage service interface.
 */
export interface IStorageService {
	/** Set default code (used on first visit before user has saved anything) */
	setDefaultCode(code: string): void;

	/** Load code from localStorage or default */
	loadCode(): string;

	/** Save code to localStorage */
	saveCode(code: string): void;

	/** Clear code from localStorage */
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
	private defaultCode: string = '';

	/**
	 * Set default code (used on first visit before user has saved anything).
	 */
	setDefaultCode(code: string): void {
		this.defaultCode = code;
	}

	/**
	 * Load code.
	 * Priority: localStorage > default sketch
	 */
	loadCode(): string {
		const storedCode = localStorage.getItem(CODE_STORAGE_KEY);
		if (storedCode) return storedCode;

		return this.defaultCode || '// No default code found';
	}

	/**
	 * Save code to localStorage.
	 */
	saveCode(code: string): void {
		localStorage.setItem(CODE_STORAGE_KEY, code);
	}

	/**
	 * Clear code from localStorage.
	 */
	clearCode(): void {
		localStorage.removeItem(CODE_STORAGE_KEY);
	}

	/**
	 * Load settings from localStorage with defaults.
	 */
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

	/**
	 * Save settings to localStorage.
	 */
	saveSettings(settings: AppSettings): void {
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	}
}

/**
 * Singleton instance.
 */
export const storageService = new StorageService();
