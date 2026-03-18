import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PaneCoordinator } from '@/features/editor-layout';
import { EngineLifecycle } from '@/app/runtime/EngineLifecycle';
import { ShareWorkflow, ShareSessionManager } from '@/features/share';
import { UIActions } from '@/app/runtime/UIActions';
import { AppShell } from '@/app/ui/AppShell';
import { EditorManager } from '@/platform/input/EditorManager';
import { ShortcutsManager, type IShortcutsManager } from '@/platform/input/ShortcutsManager';
import { CodeRandomizer } from './CodeRandomizer';
import { defaultTextmodeSketch } from '@/features/examples/content/default-sketches';
import { TextmodeEngine } from '@/engines/textmode/TextmodeEngine';
import { registry } from '@/engines/registry';
import { initAppStore, useAppStore } from '@/platform/state/appStore';
import { storageService, type IStorageService } from '@/platform/storage/StorageService';

import { createAppStoreAdapter, type AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import { createPaneStoreAdapter, type PaneStoreAdapter } from '@/platform/state/adapters/paneStoreAdapter';
import type { AppSettings } from '@/core/app.types';
import type { EngineId } from '@/core/engine.types';
import { type AppRuntimeContextValue, AppRuntimeProvider } from './AppRuntimeContext';

/**
 * Main application composition root.
 * Orchestrates runtime modules while keeping view and feature concerns delegated.
 */
export class AppRuntime {
	private readonly storage: IStorageService;
	private readonly editorManager: EditorManager;
	private readonly paneCoordinator: PaneCoordinator;
	private readonly paneStore: PaneStoreAdapter;
	private readonly storeAdapter: AppStoreAdapter;

	private readonly engineLifecycle: EngineLifecycle;
	private readonly shareSession: ShareSessionManager;
	private readonly shareWorkflow: ShareWorkflow;
	private readonly uiActions: UIActions;

	private shortcuts: IShortcutsManager | null = null;
	private storeUnsubscribers: Array<() => void> = [];
	private storeInitCleanup: (() => void) | null = null;
	private root: Root | null = null;
	private initialized = false;

	constructor() {
		this.storage = storageService;
		this.editorManager = new EditorManager();
		this.paneCoordinator = new PaneCoordinator();
		this.paneStore = createPaneStoreAdapter();
		this.storeAdapter = createAppStoreAdapter();

		// Register default code
		this.storage.registerDefaultCode('textmode', defaultTextmodeSketch);

		// Register engines
		registry.register(new TextmodeEngine());

		// Initialize Lifecycle first (it needs callbacks that refer to uiActions, which is fine as they are lazy)
		this.engineLifecycle = new EngineLifecycle({
			paneCoordinator: this.paneCoordinator,
			editorManager: this.editorManager,
			storage: this.storage,
			store: this.storeAdapter,
			render: () => this.render(),
			toggleUI: () => this.uiActions.toggleUIVisibility(),
			changeFontSize: (delta) => this.uiActions.changeFontSize(delta),
		});

		this.uiActions = new UIActions({
			storage: this.storage,
			engineLifecycle: this.engineLifecycle,
			store: this.storeAdapter,
			render: () => this.render(),
		});

		this.shareSession = new ShareSessionManager({
			getShareState: () => ({
				payload: this.storeAdapter.share.getPayload(),
				consented: this.storeAdapter.share.getConsented(),
				promptOpen: this.storeAdapter.share.getPromptOpen(),
			}),
			setSharePayload: this.storeAdapter.share.setPayload,
			setShareConsented: this.storeAdapter.share.setConsented,
			setSharePromptOpen: this.storeAdapter.share.setPromptOpen,
			setEditorsReadOnly: (readOnly) => this.editorManager.setReadOnly(readOnly),
			applyPayload: (payload) => this.engineLifecycle.applySharePayload(payload),
			focusEditor: (engineId) => this.editorManager.focusEditor(engineId),
			restoreLocalSketches: () => this.engineLifecycle.restoreLocalSketches(),
			runRestoredSketches: () => this.engineLifecycle.runRestoredSketches(),
			runSharedSketch: (payload) => this.engineLifecycle.runSharedSketch(payload),
		});

		this.shareWorkflow = new ShareWorkflow({
			store: this.storeAdapter,
			render: () => this.render(),
			clearShareLockIfPresent: () => this.shareSession.clearShareLockIfPresent(),
			applyApprovedSketch: (sketch) => this.engineLifecycle.applyApprovedSketch(sketch),
			getServerInjectedSlug: () => (window as unknown as { __SKETCH_SLUG__?: string }).__SKETCH_SLUG__,
			replaceUrl: (url) => window.history.replaceState(null, '', url),
		});
	}

	private get settings(): AppSettings {
		return this.storeAdapter.settings.getSettings();
	}

	async init(): Promise<void> {
		if (this.initialized) return;
		this.initialized = true;

		const loadedSettings = this.storage.loadSettings();
		this.storeAdapter.settings.setSettings(loadedSettings);
		await this.shareWorkflow.hydrateFromLocation(window.location);

		this.paneCoordinator.sync(loadedSettings, this.paneStore);
		this.storeInitCleanup = initAppStore();

		const appContainer = document.getElementById('app-container');
		if (!appContainer) {
			console.error('App container #app-container not found');
			return;
		}
		this.root = createRoot(appContainer);

		this.render();
		await this.paneCoordinator.waitForPanes(this.paneCoordinator.getPaneIds());
		await this.engineLifecycle.initEagerEngines();
		this.render();

		this.engineLifecycle.applyEditorSettings();
		this.shareSession.applyInitialShareIfPresent();
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
					this.storeAdapter.settings.setSettings({ ...s, autoExecute: !s.autoExecute });
				},
				toggleEditorBackdrop: () => {
					const s = this.settings;
					this.storeAdapter.settings.setSettings({ ...s, editorBackdrop: !s.editorBackdrop });
				},
				toggleUIVisibility: () => this.uiActions.toggleUIVisibility(),
				toggleStrudelAudio: () => {},
				runCodeForEngine: (engineId: string) => this.uiActions.runCodeForEngine(engineId),
			},
		});
	}

	private registerStoreSubscriptions(): void {
		const settingsUnsubscribe = useAppStore.subscribe(
			(state) => state.settings,
			(settings) => {
				this.storage.saveSettings(settings);
				this.engineLifecycle.applyEditorSettings();
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

	private makeRandomChange(): void {
		const isMobile = this.storeAdapter.ui.getIsMobile();
		const activePanel = this.storeAdapter.ui.getActivePanel();
		const focusedEditorId = this.editorManager.getFocusedEditorId();
		const candidateTargets = isMobile
			? [activePanel, focusedEditorId, 'textmode']
			: [focusedEditorId, activePanel, 'textmode'];

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

	private getContextValue(): AppRuntimeContextValue {
		const s = this.settings;
		return {
			actions: {
				share: () => { /* handled by AppShell local state */ },
				randomize: () => this.shareWorkflow.randomize(),
				makeRandomChange: () => this.makeRandomChange(),
				resetRunners: () => this.uiActions.resetRunners(),
				clearStorage: () => this.uiActions.clearStorage(),
				loadExample: (code: string, engineId: string) => this.uiActions.loadExample(code, engineId),
				revertToLastWorking: () => {
					const errorSource = this.storeAdapter.engine.getError()?.source;
					if (!errorSource) return;
					this.engineLifecycle.getEngine(errorSource as EngineId)?.getController()?.handleRevertToLastWorking();
				},
				revertToLastWorkingForEngine: (engineId: string) => {
					this.engineLifecycle.getEngine(engineId as EngineId)?.getController()?.handleRevertToLastWorking();
				},
				reconnectTextmodeRunner: () => {
					this.storeAdapter.engine.setCustomState('textmode', 'runnerReconnecting', true);
					this.engineLifecycle.reconnectTextmodeRunner();
					setTimeout(() => {
						this.storeAdapter.engine.setCustomState('textmode', 'runnerReconnecting', false);
					}, 10000);
				},
				unlockAndRun: () => this.shareSession.unlockAndRun(),
				unlockOnly: () => this.shareSession.unlockOnly(),
				discardShare: () => this.shareSession.discard(),
				openSharePrompt: () => this.shareSession.openPrompt(),
				copyShareExportUrl: (url: string) => this.uiActions.copyShareExportUrl(url),
				getShareExportData: () => this.uiActions.getShareExportData(),
			},
			layout: {
				panes: this.paneCoordinator.getPaneConfigs(),
				onPaneReady: (paneId: string, container: HTMLElement) => this.paneCoordinator.onPaneReady(paneId, container),
			},
			state: {
				randomizeLoading: this.shareWorkflow.getRandomizeLoading(),
				editorBackdrop: s.editorBackdrop,
			},
		};
	}

	private render(): void {
		if (!this.root) return;

		this.root.render(
			createElement(
				AppRuntimeProvider,
				{ value: this.getContextValue() },
				createElement(AppShell, {})
			)
		);
	}
}
