import type { ShareExportData } from '@/features/share';
import type { EngineLifecycle } from '@/app/runtime/EngineLifecycle';
import { useAppStore } from '@/platform/state/appStore';
import type { AppSettings } from '@/types/app.types';
import type { EngineId } from '@/core/engine.types';
import type { IStorageService } from '@/platform/storage/StorageService';

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

	constructor(deps: UIActionsDependencies) {
		this.deps = deps;
	}

	getShareExportData(): ShareExportData {
		return {
			createdAt: Date.now(),
			textmodeCode: this.deps.engineLifecycle.getCode('textmode'),
			strudelCode: this.deps.engineLifecycle.getCode('strudel') || null,
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
