/**
 * Main application composition root.
 * Wires engines, state, and specialized workflow controllers.
 */
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AppShell } from './components/AppShell';
import type { ShareExportData } from './components/dialogs/ShareExportDialog';
import { type AppSettings } from './types/app.types';
import { type EngineId } from './types/engine.types';
import { storageService, type IStorageService } from './services/StorageService';
import { audioService } from './services/AudioService';
import { ShareService } from './services/ShareService';
import {
	fetchApprovedSketch,
	fetchRandomApprovedSketch,
} from './services/SketchApiService';
import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import { ShortcutsManager, type IShortcutsManager } from './managers/ShortcutsManager';
import { EditorManager } from './managers/EditorManager';
import { TextmodeEngine } from './engines/textmode/TextmodeEngine';
import { StrudelEngine } from './engines/strudel/StrudelEngine';
import { StrudelAudioSource } from './engines/strudel/audio/StrudelAudioSource';
import { useAppStore, initAppStore } from './stores/appStore';
import type { SharePayload } from './types/share.types';
import { PaneCoordinator } from './app/orchestration/PaneCoordinator';
import { ShareSessionManager } from './features/share/orchestration/ShareSessionManager';
import { createPaneStoreAdapter } from './state/adapters/paneStoreAdapter';
import { createShareStoreAdapter } from './state/adapters/shareStoreAdapter';

export class AppRuntime {
	// Core services
	private readonly storage: IStorageService = storageService;
	private readonly editorManager = new EditorManager();
	private readonly paneCoordinator = new PaneCoordinator();
	private readonly shareSession: ShareSessionManager;
	
	private shortcuts: IShortcutsManager | null = null;
	private storeUnsubscribers: Array<() => void> = [];
	private storeInitCleanup: (() => void) | null = null;

	// Engines
	private readonly textmodeEngine = new TextmodeEngine();
	private strudelEngine: StrudelEngine | null = null;
	private audioUnsubscribe: (() => void) | null = null;

	// React root
	private root: Root | null = null;
	private initialized = false;
	private shareExportOpen = false;
	private shareExportData: ShareExportData | null = null;
	private randomizeLoading = false;
	private pendingApprovedSketch: ApprovedSketch | null = null;

	constructor() {
		const shareStore = createShareStoreAdapter();

		this.shareSession = new ShareSessionManager({
			getShareState: shareStore.getShareState,
			setSharePayload: shareStore.setSharePayload,
			setShareConsented: shareStore.setShareConsented,
			setSharePromptOpen: shareStore.setSharePromptOpen,
			setEditorsReadOnly: (readOnly) => this.editorManager.setReadOnly(readOnly),
			applyPayload: (payload) => this.applySharePayload(payload),
			focusEditor: (engineId) => this.editorManager.focusEditor(engineId),
			restoreLocalSketches: () => this.restoreLocalSketches(),
			runRestoredSketches: () => this.runRestoredSketches(),
			runSharedSketch: (payload) => this.runSharedSketch(payload),
		});
	}

	private get settings(): AppSettings {
		return useAppStore.getState().settings;
	}

	async init(): Promise<void> {
		if (this.initialized) return;
		this.initialized = true;

		const loadedSettings = this.storage.loadSettings();
		useAppStore.getState().setSettings(loadedSettings);

		const sharedPayload = ShareService.getFromLocation(window.location);
		if (sharedPayload) {
			useAppStore.getState().setSharePayload(sharedPayload);
		} else {
			const slugFromServer = (window as unknown as { __SKETCH_SLUG__?: string }).__SKETCH_SLUG__;
			const slugFromPath = window.location.pathname.match(/^\/s\/([a-z0-9-]+)$/i)?.[1];
			const detectedSlug = slugFromServer || slugFromPath;

			if (detectedSlug) {
				const sketchData = await fetchApprovedSketch(detectedSlug);
				if (sketchData) {
					this.pendingApprovedSketch = sketchData;
				}
			}
		}

		this.paneCoordinator.sync(loadedSettings, createPaneStoreAdapter());
		this.storeInitCleanup = initAppStore();

		const appContainer = document.getElementById('app-container');
		if (!appContainer) {
			console.error('App container #app-container not found');
			return;
		}
		this.root = createRoot(appContainer);

		this.render();
		await this.paneCoordinator.waitForPanes(this.paneCoordinator.getPaneIds());

		await this.initTextmodeEngine();
		this.render();

		if (loadedSettings.strudelEnabled) {
			await this.enableStrudel();
		}

		this.editorManager.applySettings(this.settings);
		this.shareSession.applyInitialShareIfPresent();
		this.applyPendingApprovedSketchIfPresent();
		this.shareSession.attachInteractionGuards();

		this.shortcuts = new ShortcutsManager({
			actions: {
				changeFontSize: (delta) => this.handleFontSizeChange(delta),
				toggleAutoExecute: () => {
					const s = this.settings;
					useAppStore.getState().setSettings({ ...s, autoExecute: !s.autoExecute });
				},
				toggleEditorBackdrop: () => {
					const s = this.settings;
					useAppStore.getState().setSettings({ ...s, editorBackdrop: !s.editorBackdrop });
				},
				toggleUIVisibility: () => this.toggleUIVisibility(),
				hushAudio: () => this.strudelEngine?.hush(),
				runCodeForEngine: (engineId: string) => this.handleRunCodeForEngine(engineId),
			},
		});
		this.shortcuts.init();

		const settingsUnsubscribe = useAppStore.subscribe(
			(state) => state.settings,
			(settings, previous) => {
				this.storage.saveSettings(settings);
				this.editorManager.applySettings(settings);

				if (!previous || settings.strudelEnabled !== previous.strudelEnabled) {
					void this.setStrudelEnabled(settings.strudelEnabled);
				}
			}
		);

		const uiVisibilityUnsubscribe = useAppStore.subscribe(
			(state) => state.settings.uiVisible,
			(uiVisible) => {
				const container = document.getElementById('app-container');
				if (container) {
					container.style.display = uiVisible ? '' : 'none';
				}
			}
		);

		this.storeUnsubscribers.push(settingsUnsubscribe, uiVisibilityUnsubscribe);
	}

	dispose(): void {
		this.shortcuts?.dispose();
		this.shortcuts = null;

		this.shareSession.dispose();
		
		for (const unsubscribe of this.storeUnsubscribers) {
			unsubscribe();
		}
		this.storeUnsubscribers = [];

		if (this.storeInitCleanup) {
			this.storeInitCleanup();
			this.storeInitCleanup = null;
		}

		this.stopAudioReactivity();
		this.strudelEngine?.dispose();
		this.strudelEngine = null;
		this.textmodeEngine.dispose();

		this.paneCoordinator.clearPendingResolvers();
		this.root?.unmount();
		this.root = null;
		this.initialized = false;
	}

	private getShellProps() {
		const errorSource = useAppStore.getState().error?.source;

		const handleRevert = () => {
			if (!errorSource) return;
			const engine = this.getEngine(errorSource as EngineId);
			engine?.getController()?.handleRevertToLastWorking();
		};

		return {
			onShare: () => this.handleShare(),
			onRandomize: () => void this.handleRandomize(),
			randomizeLoading: this.randomizeLoading,
			onClearStorage: () => this.handleClearStorage(),
			onLoadExample: (code: string, engineId: string) => this.handleLoadExample(code, engineId),
			onRevertToLastWorking: handleRevert,
			onShareUnlockAndRun: () => this.shareSession.unlockAndRun(),
			onShareUnlockOnly: () => this.shareSession.unlockOnly(),
			onShareDiscard: () => this.shareSession.discard(),
			onSharePromptOpen: () => this.shareSession.openPrompt(),
			shareExportOpen: this.shareExportOpen,
			shareExportData: this.shareExportData,
			onShareExportOpenChange: (open: boolean) => this.handleShareExportOpenChange(open),
			onShareExportCopy: (url: string) => this.handleShareExportCopy(url),
			};
	}

	private render(): void {
		if (!this.root) return;

		this.root.render(
			createElement(AppShell, {
				panes: this.paneCoordinator.getPaneConfigs(),
				editorBackdrop: this.settings.editorBackdrop,
				onPaneReady: (paneId: string, container: HTMLElement) => {
					this.paneCoordinator.onPaneReady(paneId, container);
				},
				...this.getShellProps(),
			})
		);
	}

	private async initTextmodeEngine(): Promise<void> {
		useAppStore.getState().initEngineState('textmode');
		const container = await this.paneCoordinator.waitForPane('textmode');

		await this.textmodeEngine.init({
			editorContainer: container,
			visualContainer: document.body,
			getSettings: () => this.settings,
			callbacks: {
				onRenderOverlay: () => this.render(),
				onSaveCode: (code: string) => this.storage.saveEngineCode('textmode', code),
			},
			getInitialCode: () => this.storage.loadEngineCode('textmode'),
			toggleUI: () => this.toggleUIVisibility(),
			changeFontSize: (delta: number) => this.handleFontSizeChange(delta),
		});

		const editor = this.textmodeEngine.getEditor();
		if (editor) {
			this.editorManager.registerEditor('textmode', editor);
		}
	}

	private async enableStrudel(): Promise<void> {
		if (this.strudelEngine) return;

		useAppStore.getState().initEngineState('strudel');
		const container = await this.paneCoordinator.waitForPane('strudel');

		this.strudelEngine = new StrudelEngine();
		await this.strudelEngine.init({
			editorContainer: container,
			getSettings: () => this.settings,
			callbacks: {
				onRenderOverlay: () => this.render(),
				onSaveCode: (code: string) => this.storage.saveEngineCode('strudel', code),
			},
			getInitialCode: () => this.storage.loadEngineCode('strudel'),
			toggleUI: () => this.toggleUIVisibility(),
			changeFontSize: (delta: number) => this.handleFontSizeChange(delta),
		});

		const editor = this.strudelEngine.getEditor();
		if (editor) {
			this.editorManager.registerEditor('strudel', editor);
		}

		this.editorManager.applySettings(this.settings);
		this.shareSession.applyInitialShareIfPresent();

		const approvedSketch = useAppStore.getState().approvedSketch;
		if (approvedSketch?.strudelCode) {
			this.strudelEngine.setCode(approvedSketch.strudelCode, { silent: true });
			this.strudelEngine.getRuntime()?.forceRun(approvedSketch.strudelCode);
		} else if (approvedSketch) {
			this.strudelEngine.hush();
		}
		this.startAudioReactivity();
	}

	private disableStrudel(): void {
		if (!this.strudelEngine) return;

		this.strudelEngine.hush();
		this.stopAudioReactivity();

		this.editorManager.unregisterEditor('strudel');
		this.strudelEngine.dispose();
		this.strudelEngine = null;
		this.paneCoordinator.removePane('strudel');
		useAppStore.getState().setEngineInitialized('strudel', false);
		useAppStore.getState().setEngineCustomState('strudel', 'state', {
			isPlaying: false,
			isInitialized: false,
		});
	}

	private async setStrudelEnabled(enabled: boolean): Promise<void> {
		this.paneCoordinator.sync(this.settings, createPaneStoreAdapter());
		this.render();

		if (enabled) {
			await this.paneCoordinator.waitForPanes(this.paneCoordinator.getPaneIds());
			await this.enableStrudel();
		} else {
			this.disableStrudel();
		}
	}

	private startAudioReactivity(): void {
		if (this.audioUnsubscribe) return;
		const source = new StrudelAudioSource();
		audioService.setSource(source);
		this.audioUnsubscribe = audioService.subscribe((data) => {
			this.textmodeEngine.sendAudioData(data);
		});
		audioService.start();
	}

	private stopAudioReactivity(): void {
		if (this.audioUnsubscribe) {
			this.audioUnsubscribe();
			this.audioUnsubscribe = null;
		}
		audioService.stop();
		audioService.setSource(null);

		const snapshot = audioService.getData();
		this.textmodeEngine.sendAudioData({
			fft: new Array(snapshot.fft.length).fill(0),
			waveform: new Array(snapshot.waveform.length).fill(128),
			timestamp: performance.now(),
		});
	}

	private applyPendingApprovedSketchIfPresent(): void {
		if (!this.pendingApprovedSketch) return;
		const sketch = this.pendingApprovedSketch;
		this.pendingApprovedSketch = null;
		this.applyApprovedSketch(sketch);
	}

	private applyApprovedSketch(sketch: ApprovedSketch): void {
		const store = useAppStore.getState();
		this.shareSession.clearShareLockIfPresent();

		store.setApprovedSketch(sketch);
		store.setError(null);
		this.textmodeEngine.setCode(sketch.textmodeCode, { silent: true });
		this.textmodeEngine.getRuntime()?.forceRun(sketch.textmodeCode);

		if (this.strudelEngine) {
			if (sketch.strudelCode) {
				this.strudelEngine.setCode(sketch.strudelCode, { silent: true });
				this.strudelEngine.getRuntime()?.forceRun(sketch.strudelCode);
			} else {
				this.strudelEngine.hush();
			}
		}

		if (store.isMobile) {
			store.setActivePanel('textmode');
			this.render();
		}
	}

	private async handleRandomize(): Promise<void> {
		if (this.randomizeLoading) return;

		this.randomizeLoading = true;
		this.render();

		try {
			const currentSlug = useAppStore.getState().approvedSketch?.slug;
			const sketch = await fetchRandomApprovedSketch(currentSlug);
			if (!sketch) return;
			this.applyApprovedSketch(sketch);
		} finally {
			this.randomizeLoading = false;
			this.render();
		}
	}

	private applySharePayload(payload: SharePayload): void {
		if (payload.engines.textmode !== undefined) {
			this.textmodeEngine.setCode(payload.engines.textmode, { silent: true });
		}

		if (payload.engines.strudel !== undefined && this.strudelEngine) {
			this.strudelEngine.setCode(payload.engines.strudel, { silent: true });
		}
	}

	private restoreLocalSketches(): void {
		const textmodeCode = this.storage.loadEngineCode('textmode');
		this.textmodeEngine.setCode(textmodeCode, { silent: true });

		if (this.strudelEngine) {
			const strudelCode = this.storage.loadEngineCode('strudel');
			this.strudelEngine.setCode(strudelCode, { silent: true });
		}
	}

	private runRestoredSketches(): void {
		this.textmodeEngine.getController()?.handleForceRun();
	}

	private runSharedSketch(payload: SharePayload): void {
		if (payload.engines.textmode !== undefined) {
			this.textmodeEngine.getController()?.handleForceRun();
		}

		if (payload.engines.strudel !== undefined && this.strudelEngine) {
			this.strudelEngine.getController()?.handleForceRun();
		}
	}

	private handleShare(): void {
		this.shareExportData = {
			createdAt: Date.now(),
			textmodeCode: this.textmodeEngine.getCode(),
			strudelCode: this.strudelEngine?.getCode() ?? null,
		};
		this.shareExportOpen = true;
		this.render();
	}

	private handleShareExportOpenChange(open: boolean): void {
		this.shareExportOpen = open;
		if (!open) {
			this.shareExportData = null;
		}
		this.render();
	}

	private handleShareExportCopy(url: string): void {
		this.copyToClipboard(url);
	}

	private copyToClipboard(value: string): void {
		if (navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(value).catch(() => {
				this.fallbackCopy(value);
			});
			return;
		}
		this.fallbackCopy(value);
	}

	private fallbackCopy(value: string): void {
		window.prompt('Copy this link to share your sketch:', value);
	}

	private handleClearStorage(): void {
		this.storage.clearCode();
		this.resetAll();
	}

	private handleLoadExample(code: string, engineId: string): void {
		const engine = this.getEngine(engineId as EngineId);
		if (!engine) return;

		engine.setCode(code);
		this.storage.saveEngineCode(engineId, code);
		engine.getController()?.handleForceRun();

		if (useAppStore.getState().isMobile) {
			useAppStore.getState().setActivePanel(engineId);
			this.render();
		}
	}

	private resetAll(): void {
		useAppStore.getState().setEngineLastWorkingCode('textmode', null);
		this.textmodeEngine.setCode(this.textmodeEngine.getDefaultCode());

		useAppStore.getState().setEngineLastWorkingCode('strudel', null);
		if (this.strudelEngine) {
			this.strudelEngine.setCode(this.strudelEngine.getDefaultCode());
			this.strudelEngine.hush();
		}
	}

	private toggleUIVisibility(): void {
		const newVisibility = !this.settings.uiVisible;
		const s = this.settings;
		useAppStore.getState().setSettings({ ...s, uiVisible: newVisibility });
	}

	private handleFontSizeChange(delta: number): void {
		const currentSize = this.settings.fontSize;
		const newSize = Math.min(32, Math.max(10, currentSize + delta));
		if (newSize !== currentSize) {
			const s = this.settings;
			useAppStore.getState().setSettings({ ...s, fontSize: newSize });
		}
	}

	private handleRunCodeForEngine(engineId: string): void {
		const engine = this.getEngine(engineId as EngineId);
		engine?.getController()?.handleForceRun();
	}

	private getEngine(engineId: EngineId): TextmodeEngine | StrudelEngine | null {
		if (engineId === 'textmode') return this.textmodeEngine;
		if (engineId === 'strudel') return this.strudelEngine;
		return null;
	}
}

// Backward-compatible alias while callers migrate to AppRuntime naming.
export { AppRuntime as App };
