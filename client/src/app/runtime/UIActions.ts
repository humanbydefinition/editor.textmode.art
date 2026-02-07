import type { ShareExportData } from '@/features/share';
import type { EngineLifecycle } from '@/app/runtime/EngineLifecycle';
import { useAppStore } from '@/platform/state/appStore';
import type { AppSettings } from '@/types/app.types';
import type { EngineId } from '@/types/engine.types';
import type { IStorageService } from '@/services/StorageService';

interface UIActionsDependencies {
	storage: IStorageService;
	engineLifecycle: EngineLifecycle;
	getSettings: () => AppSettings;
	setSettings: (settings: AppSettings) => void;
	render: () => void;
}

/**
 * Owns user-triggered UI actions and export dialog state.
 */
export class UIActions {
	private readonly deps: UIActionsDependencies;
	private shareExportOpen = false;
	private shareExportData: ShareExportData | null = null;

	constructor(deps: UIActionsDependencies) {
		this.deps = deps;
	}

	getShareExportOpen(): boolean {
		return this.shareExportOpen;
	}

	getShareExportData(): ShareExportData | null {
		return this.shareExportData;
	}

	openShareExport(): void {
		this.shareExportData = {
			createdAt: Date.now(),
			textmodeCode: this.deps.engineLifecycle.getCode('textmode'),
			strudelCode: this.deps.engineLifecycle.getCode('strudel') || null,
		};
		this.shareExportOpen = true;
		this.deps.render();
	}

	setShareExportOpen(open: boolean): void {
		this.shareExportOpen = open;
		if (!open) {
			this.shareExportData = null;
		}
		this.deps.render();
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
		this.deps.engineLifecycle.resetAll();
	}

	loadExample(code: string, engineId: string): void {
		const typedEngineId = engineId as EngineId;
		const loaded = this.deps.engineLifecycle.loadExample(typedEngineId, code);
		if (!loaded) return;

		if (useAppStore.getState().isMobile) {
			useAppStore.getState().setActivePanel(typedEngineId);
			this.deps.render();
		}
	}

	toggleUIVisibility(): void {
		const settings = this.deps.getSettings();
		this.deps.setSettings({ ...settings, uiVisible: !settings.uiVisible });
	}

	changeFontSize(delta: number): void {
		const settings = this.deps.getSettings();
		const newSize = Math.min(32, Math.max(10, settings.fontSize + delta));
		if (newSize === settings.fontSize) return;
		this.deps.setSettings({ ...settings, fontSize: newSize });
	}

	runCodeForEngine(engineId: string): void {
		this.deps.engineLifecycle.runEngine(engineId as EngineId);
	}

	private fallbackCopy(value: string): void {
		window.prompt('Copy this link to share your sketch:', value);
	}
}
