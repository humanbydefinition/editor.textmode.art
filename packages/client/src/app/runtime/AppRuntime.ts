import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PaneCoordinator } from '@/features/editor-layout';
import { ShareManager } from '@/features/share';
import { UIActions } from '@/app/runtime/UIActions';
import { AppShell } from '@/app/ui/AppShell';
import { ShortcutsManager, type IShortcutsManager } from '@/platform/input/ShortcutsManager';
import { CodeRandomizer } from './CodeRandomizer';
import { defaultTextmodeSketch } from '@/features/examples/content/default-sketches';
import { TextmodeEngine, type TextmodeEngineContext } from '@/engines/textmode/TextmodeEngine';
import type { TextmodeEditor } from '@/engines/textmode/editor/TextmodeEditor';
import { initAppStore, useAppStore } from '@/platform/state/appStore';
import { editorStorage, type IEditorStorage } from '@/platform/storage/EditorStorage';

import { createAppStoreAdapter, type AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { AppSettings } from '@/core/app.types';
import type { SharePayload } from '@synth.textmode.art/contracts/share';
import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import { type AppRuntimeContextValue, AppRuntimeProvider } from './AppRuntimeContext';

/**
 * Main application composition root.
 * Orchestrates the textmode engine, share workflow, and UI.
 */
export class AppRuntime {
	private readonly storage: IEditorStorage;
	private readonly paneCoordinator: PaneCoordinator;
	private readonly storeAdapter: AppStoreAdapter;

	private readonly textmodeEngine: TextmodeEngine;
	private readonly shareManager: ShareManager;
	private readonly uiActions: UIActions;

	private textmodeEditor: TextmodeEditor | null = null;
	private shortcuts: IShortcutsManager | null = null;
	private storeUnsubscribers: Array<() => void> = [];
	private storeInitCleanup: (() => void) | null = null;
	private root: Root | null = null;
	private initialized = false;

	constructor() {
		this.storage = editorStorage;
		this.paneCoordinator = new PaneCoordinator();
		this.storeAdapter = createAppStoreAdapter();

		// Register default code
		this.storage.setDefaultCode(defaultTextmodeSketch);

		// Create engine directly
		this.textmodeEngine = new TextmodeEngine();

		this.uiActions = new UIActions({
			storage: this.storage,
			getCode: () => this.textmodeEngine.getCode(),
			store: this.storeAdapter,
			render: () => this.render(),
			loadExample: (code) => this.loadExample(code),
			reconnectAllRunners: () => this.reconnectAllRunners(),
			resetAll: () => this.resetAll(),
		});

		this.shareManager = new ShareManager({
			store: this.storeAdapter,
			render: () => this.render(),
			setEditorReadOnly: (readOnly) => this.setEditorReadOnly(readOnly),
			applyPayload: (payload) => this.applySharePayload(payload),
			focusEditor: () => this.focusEditor(),
			restoreLocalSketches: () => this.restoreLocalSketches(),
			runRestoredSketches: () => this.runRestoredSketches(),
			runSharedSketch: () => this.runEngine(),
			applyApprovedSketch: (sketch) => this.applyApprovedSketch(sketch),
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
		await this.shareManager.hydrateFromLocation(window.location);

		this.paneCoordinator.sync(loadedSettings, this.storeAdapter);
		this.storeInitCleanup = initAppStore();

		const appContainer = document.getElementById('app-container');
		if (!appContainer) {
			console.error('App container #app-container not found');
			return;
		}
		this.root = createRoot(appContainer);

		this.render();
		await this.paneCoordinator.waitForPanes(this.paneCoordinator.getPaneIds());
		await this.initEngine();
		this.render();

		this.applyEditorSettings();
		this.shareManager.applyInitialShareIfPresent();
		this.shareManager.applyPendingApprovedSketchIfPresent();
		this.shareManager.attachInteractionGuards();
		this.shortcuts = this.createShortcutsManager();
		this.shortcuts.init();

		this.registerStoreSubscriptions();
	}

	dispose(): void {
		this.shortcuts?.dispose();
		this.shortcuts = null;
		this.shareManager.dispose();

		for (const unsubscribe of this.storeUnsubscribers) {
			unsubscribe();
		}
		this.storeUnsubscribers = [];

		if (this.storeInitCleanup) {
			this.storeInitCleanup();
			this.storeInitCleanup = null;
		}

		this.textmodeEditor = null;
		if (this.textmodeEngine.isInitialized()) {
			this.textmodeEngine.dispose();
		}
		this.storeAdapter.engine.setIsInitialized(false);
		this.storeAdapter.engine.setRunnerUnavailable(false);
		this.storeAdapter.engine.setRunnerReconnecting(false);
		this.storeAdapter.engine.setRunnerReady(false);

		this.paneCoordinator.clearPendingResolvers();
		this.root?.unmount();
		this.root = null;
		this.initialized = false;
	}

	// ----- Engine lifecycle (inlined from EngineLifecycle) -----

	private async initEngine(): Promise<void> {
		const container = await this.paneCoordinator.waitForPane('textmode');
		await this.textmodeEngine.init(this.createEngineContext(container));

		this.textmodeEditor = this.textmodeEngine.getEditor();

		this.applyEditorSettings();
	}

	private createEngineContext(editorContainer: HTMLElement): TextmodeEngineContext {
		return {
			editorContainer,
			visualContainer: document.body,
			getSettings: this.storeAdapter.settings.getSettings,
			store: this.storeAdapter,
			callbacks: {
				onRenderOverlay: () => this.render(),
				onSaveCode: (code: string) => this.storage.saveCode(code),
			},
			getInitialCode: () => this.storage.loadCode(),
			toggleUI: () => this.uiActions.toggleUIVisibility(),
			changeFontSize: (delta) => this.uiActions.changeFontSize(delta),
			onRunnerConnected: () => {
				this.storeAdapter.engine.setRunnerUnavailable(false);
				this.storeAdapter.engine.setRunnerReconnecting(false);
				this.storeAdapter.engine.setRunnerReady(true);
			},
			onRunnerDisconnected: () => {
				this.storeAdapter.engine.setRunnerUnavailable(true);
				this.storeAdapter.engine.setRunnerReconnecting(false);
				this.storeAdapter.engine.setRunnerReady(false);
			},
		};
	}

	private applyEditorSettings(): void {
		const editor = this.textmodeEditor;
		if (!editor) return;

		const settings = this.storeAdapter.settings.getSettings();
		editor.updateOptions({
			fontSize: settings.fontSize,
			lineNumbers: settings.lineNumbers ? 'on' : 'off',
			lineNumbersMinChars: settings.lineNumbers ? 2 : 0,
			lineDecorationsWidth: settings.lineNumbers ? 16 : 0,
		});
		editor.updateEnvironment({ backdrop: settings.editorBackdrop });
	}

	private runEngine(): void {
		this.textmodeEngine.getController()?.handleForceRun();
	}

	private loadExample(code: string): boolean {
		if (!this.textmodeEngine.isInitialized()) return false;

		this.textmodeEngine.setCode(code);
		this.storage.saveCode(code);
		this.textmodeEngine.getController()?.handleForceRun();

		return true;
	}

	private applySharePayload(payload: SharePayload): void {
		if (!this.textmodeEngine.isInitialized()) return;
		const code = payload.engines.textmode;
		if (typeof code !== 'string') return;
		this.textmodeEngine.setCode(code, { silent: true });
	}

	private restoreLocalSketches(): void {
		if (!this.textmodeEngine.isInitialized()) return;
		const code = this.storage.loadCode();
		this.textmodeEngine.setCode(code, { silent: true });
	}

	private runRestoredSketches(): void {
		this.textmodeEngine.getController()?.handleForceRun();
	}

	private setEditorReadOnly(readOnly: boolean): void {
		this.textmodeEditor?.updateOptions({ readOnly });
	}

	private focusEditor(): void {
		this.textmodeEditor?.focus();
	}

	private applyApprovedSketch(sketch: ApprovedSketch): void {
		const code = sketch.textmodeCode;
		if (!this.textmodeEngine.isInitialized()) return;

		this.textmodeEngine.setCode(code, { silent: true });
		this.textmodeEngine.getRuntime()?.forceRun(code);
	}

	private reconnectAllRunners(): void {
		if (!this.textmodeEngine.isInitialized()) return;
		this.textmodeEngine.reconnectRuntime();
		this.textmodeEngine.getController()?.handleForceRun();
	}

	private resetAll(): void {
		this.storeAdapter.share.clearOriginalApprovedSketch();
		this.storeAdapter.engine.setLastWorkingCode(null);
		this.storage.clearCode();

		if (!this.textmodeEngine.isInitialized()) return;
		const defaultCode = this.storage.loadCode();
		this.textmodeEngine.setCode(defaultCode);
	}

	// ----- End engine lifecycle -----

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
				runCode: () => this.runEngine(),
			},
		});
	}

	private registerStoreSubscriptions(): void {
		const settingsUnsubscribe = useAppStore.subscribe(
			(state) => state.settings,
			(settings) => {
				this.storage.saveSettings(settings);
				this.applyEditorSettings();
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
		const code = this.textmodeEngine.getCode();
		const newCode = CodeRandomizer.replaceRandomNumber(code);

		if (code !== newCode) {
			this.textmodeEngine.setCode(newCode);
			this.textmodeEngine.getController()?.handleForceRun();
			// On mobile, avoid forcing editor focus to prevent opening the software keyboard.
			const isMobile = this.storeAdapter.ui.getIsMobile();
			if (!isMobile) {
				this.focusEditor();
			}
		}
	}

	private getContextValue(): AppRuntimeContextValue {
		const s = this.settings;
		return {
			actions: {
				randomize: () => this.shareManager.randomize(),
				makeRandomChange: () => this.makeRandomChange(),
				resetRunners: () => this.uiActions.resetRunners(),
				clearStorage: () => this.uiActions.clearStorage(),
				loadExample: (code: string) => this.uiActions.loadExample(code),
				revertToLastWorking: () => {
					this.textmodeEngine.getController()?.handleRevertToLastWorking();
				},
				reconnectTextmodeRunner: () => {
					this.storeAdapter.engine.setRunnerReconnecting(true);
					this.textmodeEngine.reconnectRuntime();
					setTimeout(() => {
						this.storeAdapter.engine.setRunnerReconnecting(false);
					}, 10000);
				},
				unlockAndRun: () => this.shareManager.unlockAndRun(),
				unlockOnly: () => this.shareManager.unlockOnly(),
				discardShare: () => this.shareManager.discard(),
				openSharePrompt: () => this.shareManager.openPrompt(),
				copyShareExportUrl: (url: string) => this.uiActions.copyShareExportUrl(url),
				getShareExportData: () => this.uiActions.getShareExportData(),
			},
			layout: {
				panes: this.paneCoordinator.getPaneConfigs(),
				onPaneReady: (paneId: string, container: HTMLElement) =>
					this.paneCoordinator.onPaneReady(paneId, container),
			},
			state: {
				randomizeLoading: this.shareManager.getRandomizeLoading(),
				editorBackdrop: s.editorBackdrop,
			},
		};
	}

	private render(): void {
		if (!this.root) return;

		this.root.render(
			createElement(AppRuntimeProvider, { value: this.getContextValue() }, createElement(AppShell, {}))
		);
	}
}
