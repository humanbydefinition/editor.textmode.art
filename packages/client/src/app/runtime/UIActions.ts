import type { ShareExportData } from '@/features/share';
import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { IEditorStorage } from '@/platform/storage/EditorStorage';

interface UIActionsDependencies {
	storage: IEditorStorage;
	getCode: () => string;
	store: AppStoreAdapter;
	render: () => void;
	loadExample: (code: string) => boolean;
	reconnectAllRunners: () => void;
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
		this.deps.store.engine.setRunnerReconnecting(true);
		this.deps.reconnectAllRunners();
		setTimeout(() => {
			this.deps.store.engine.setRunnerReconnecting(false);
		}, 10000);
	}

	loadExample(code: string): void {
		const loaded = this.deps.loadExample(code);
		if (!loaded) return;

		if (this.deps.store.ui.getIsMobile()) {
			this.deps.store.ui.setActivePaneId('textmode');
			this.deps.render();
		}
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
