import type { ShareExportData } from '@/features/share';
import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { IEditorStorage } from '@/platform/storage/EditorStorage';

interface UIActionsDependencies {
	storage: IEditorStorage;
	getCode: () => string;
	store: AppStoreAdapter;
	loadExample: (code: string) => boolean;
	reconnectRunners: () => void;
	resetAll: () => void;
}

/**
 * Owns user-triggered UI actions and export dialog state.
 */
export class UIActions {
	private readonly deps: UIActionsDependencies;

	constructor(deps: UIActionsDependencies) {
		this.deps = deps;
	}

	getShareExportData(): ShareExportData {
		return {
			createdAt: Date.now(),
			textmodeCode: this.deps.getCode(),
		};
	}

	copyShareExportUrl(url: string): void {
		if (navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(url).catch(() => {
				this.fallbackCopy(url);
			});
			return;
		}
		this.fallbackCopy(url);
	}

	clearStorage(): void {
		this.deps.storage.clearCode();
		this.deps.resetAll();
		this.resetRunners();
	}

	resetRunners(): void {
		this.deps.reconnectRunners();
	}

	loadExample(code: string): void {
		this.deps.loadExample(code);
	}

	toggleUIVisibility(): void {
		const settings = this.deps.store.settings.getSettings();
		this.deps.store.settings.setSettings({ ...settings, uiVisible: !settings.uiVisible });
	}

	changeFontSize(delta: number): void {
		const settings = this.deps.store.settings.getSettings();
		const newSize = Math.min(32, Math.max(10, settings.fontSize + delta));
		if (newSize === settings.fontSize) return;
		this.deps.store.settings.setSettings({ ...settings, fontSize: newSize });
	}

	private fallbackCopy(value: string): void {
		window.prompt('Copy this link to share your sketch:', value);
	}
}
