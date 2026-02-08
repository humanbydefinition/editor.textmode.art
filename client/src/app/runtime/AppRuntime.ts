import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PaneCoordinator } from '@/app/orchestration/PaneCoordinator';
import { EngineLifecycle } from '@/app/runtime/EngineLifecycle';
import { ShareWorkflow } from '@/app/runtime/ShareWorkflow';
import { UIActions } from '@/app/runtime/UIActions';
import { AppShell } from '@/components/AppShell';
import { ShareSessionManager } from '@/features/share/orchestration/ShareSessionManager';
import { EditorManager } from '@/managers/EditorManager';
import { ShortcutsManager, type IShortcutsManager } from '@/managers/ShortcutsManager';
import { CodeRandomizer } from '@/services/CodeRandomizer';
import { createShareStoreAdapter } from '@/platform/state/adapters/shareStoreAdapter';
import { initAppStore, useAppStore } from '@/platform/state/appStore';
import { storageService, type IStorageService } from '@/services/StorageService';
import { createPaneStoreAdapter } from '@/platform/state/adapters/paneStoreAdapter';
import type { AppSettings } from '@/types/app.types';
import type { EngineId } from '@/types/engine.types';

/**
 * Main application composition root.
 * Orchestrates runtime modules while keeping view and feature concerns delegated.
 */
export class AppRuntime {
	private readonly storage: IStorageService = storageService;
	private readonly editorManager = new EditorManager();
	private readonly paneCoordinator = new PaneCoordinator();
	private readonly engineLifecycle = new EngineLifecycle({
		paneCoordinator: this.paneCoordinator,
		editorManager: this.editorManager,
		storage: this.storage,
		getSettings: () => this.settings,
		render: () => this.render(),
		toggleUI: () => this.uiActions.toggleUIVisibility(),
		changeFontSize: (delta) => this.uiActions.changeFontSize(delta),
	});
	private readonly shareSession: ShareSessionManager;
	private readonly shareWorkflow: ShareWorkflow;
	private readonly uiActions: UIActions;

	private shortcuts: IShortcutsManager | null = null;
	private storeUnsubscribers: Array<() => void> = [];
	private storeInitCleanup: (() => void) | null = null;
	private root: Root | null = null;
	private initialized = false;

	constructor() {
		const shareStore = createShareStoreAdapter();
		this.shareSession = new ShareSessionManager({
			getShareState: shareStore.getShareState,
			setSharePayload: shareStore.setSharePayload,
			setShareConsented: shareStore.setShareConsented,
			setSharePromptOpen: shareStore.setSharePromptOpen,
			setEditorsReadOnly: (readOnly) => this.editorManager.setReadOnly(readOnly),
			applyPayload: (payload) => this.engineLifecycle.applySharePayload(payload),
			focusEditor: (engineId) => this.editorManager.focusEditor(engineId),
			restoreLocalSketches: () => this.engineLifecycle.restoreLocalSketches(),
			runRestoredSketches: () => this.engineLifecycle.runRestoredSketches(),
			runSharedSketch: (payload) => this.engineLifecycle.runSharedSketch(payload),
		});

		this.shareWorkflow = new ShareWorkflow({
			render: () => this.render(),
			clearShareLockIfPresent: () => this.shareSession.clearShareLockIfPresent(),
			applyApprovedSketch: (sketch) => this.engineLifecycle.applyApprovedSketch(sketch),
			applyApprovedSketchToStrudel: (sketch) => this.engineLifecycle.applyApprovedSketchToStrudel(sketch),
			getServerInjectedSlug: () => (window as unknown as { __SKETCH_SLUG__?: string }).__SKETCH_SLUG__,
		});

		this.uiActions = new UIActions({
			storage: this.storage,
			engineLifecycle: this.engineLifecycle,
			getSettings: () => this.settings,
			setSettings: (settings) => useAppStore.getState().setSettings(settings),
			render: () => this.render(),
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
		await this.shareWorkflow.hydrateFromLocation(window.location);

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
		await this.engineLifecycle.initTextmodeEngine();
		this.render();

		if (loadedSettings.strudelEnabled) {
			await this.engineLifecycle.enableStrudel();
		}

		this.engineLifecycle.applyEditorSettings();
		this.shareSession.applyInitialShareIfPresent();
		if (loadedSettings.strudelEnabled) {
			this.shareWorkflow.syncApprovedSketchToStrudelIfPresent();
		}
		this.shareWorkflow.applyPendingApprovedSketchIfPresent();
		this.shareSession.attachInteractionGuards();
		this.shortcuts = this.createShortcutsManager();
		this.shortcuts.init();

		this.registerStoreSubscriptions();
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

		this.engineLifecycle.dispose();
		this.paneCoordinator.clearPendingResolvers();
		this.root?.unmount();
		this.root = null;
		this.initialized = false;
	}

	private createShortcutsManager(): IShortcutsManager {
		return new ShortcutsManager({
			actions: {
				changeFontSize: (delta) => this.uiActions.changeFontSize(delta),
				toggleAutoExecute: () => {
					const s = this.settings;
					useAppStore.getState().setSettings({ ...s, autoExecute: !s.autoExecute });
				},
				toggleEditorBackdrop: () => {
					const s = this.settings;
					useAppStore.getState().setSettings({ ...s, editorBackdrop: !s.editorBackdrop });
				},
				toggleUIVisibility: () => this.uiActions.toggleUIVisibility(),
				hushAudio: () => this.engineLifecycle.hushStrudel(),
				runCodeForEngine: (engineId: string) => this.uiActions.runCodeForEngine(engineId),
			},
		});
	}

	private registerStoreSubscriptions(): void {
		const settingsUnsubscribe = useAppStore.subscribe(
			(state) => state.settings,
			(settings, previous) => {
				this.storage.saveSettings(settings);
				this.engineLifecycle.applyEditorSettings();
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

	private async setStrudelEnabled(enabled: boolean): Promise<void> {
		const didEnable = await this.engineLifecycle.setStrudelEnabled(enabled);
		if (didEnable) {
			this.shareSession.applyInitialShareIfPresent();
			this.shareWorkflow.syncApprovedSketchToStrudelIfPresent();
		}
	}

	private makeRandomChange(): void {
		const { isMobile, activePanel } = useAppStore.getState();
		const focusedEditorId = this.editorManager.getFocusedEditorId();
		const candidateTargets = isMobile
			? [activePanel, focusedEditorId, 'textmode', 'strudel']
			: [focusedEditorId, activePanel, 'textmode', 'strudel'];

		const targetId = candidateTargets.find(
			(id): id is string => Boolean(id) && Boolean(this.engineLifecycle.getEngine(id as EngineId))
		);
		if (!targetId) return;

		const engine = this.engineLifecycle.getEngine(targetId as EngineId);
		if (engine) {
			const code = engine.getCode();
			const newCode = CodeRandomizer.replaceRandomNumber(code);

			if (code !== newCode) {
				engine.setCode(newCode);
				engine.getController()?.handleForceRun();
				// On mobile, avoid forcing editor focus to prevent opening the software keyboard.
				if (!isMobile) {
					// Restore focus to editor to allow seamless desktop workflow.
					this.editorManager.focusEditor(targetId);
				}
			}
		}
	}

	private render(): void {
		if (!this.root) return;

		const errorSource = useAppStore.getState().error?.source;
		this.root.render(
			createElement(AppShell, {
				panes: this.paneCoordinator.getPaneConfigs(),
				editorBackdrop: this.settings.editorBackdrop,
				onPaneReady: (paneId: string, container: HTMLElement) => this.paneCoordinator.onPaneReady(paneId, container),
				onShare: () => this.uiActions.openShareExport(),
				onRandomize: () => void this.shareWorkflow.randomize(),
				onMakeRandomChange: () => this.makeRandomChange(),
				randomizeLoading: this.shareWorkflow.getRandomizeLoading(),
				onClearStorage: () => this.uiActions.clearStorage(),
				onLoadExample: (code: string, engineId: string) => this.uiActions.loadExample(code, engineId),
				onRevertToLastWorking: () => {
					if (!errorSource) return;
					this.engineLifecycle.getEngine(errorSource as EngineId)?.getController()?.handleRevertToLastWorking();
				},
				onShareUnlockAndRun: () => this.shareSession.unlockAndRun(),
				onShareUnlockOnly: () => this.shareSession.unlockOnly(),
				onShareDiscard: () => this.shareSession.discard(),
				onSharePromptOpen: () => this.shareSession.openPrompt(),
				shareExportOpen: this.uiActions.getShareExportOpen(),
				shareExportData: this.uiActions.getShareExportData(),
				onShareExportOpenChange: (open: boolean) => this.uiActions.setShareExportOpen(open),
				onShareExportCopy: (url: string) => this.uiActions.copyShareExportUrl(url),
			})
		);
	}
}
