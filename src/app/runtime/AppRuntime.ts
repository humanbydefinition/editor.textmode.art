import { ShareManager } from '@/features/share';
import { UIActions } from '@/app/runtime/UIActions';
import { ShortcutsManager, type IShortcutsManager } from '@/platform/input/ShortcutsManager';
import { CodeRandomizer } from './CodeRandomizer';
import { defaultTextmodeSketch } from '@/features/examples/content/default-sketches';
import { getExampleEngineCatalog } from '@/features/examples/model/exampleCatalog';
import { TextmodeEngine, type TextmodeEngineContext } from '@/textmode/TextmodeEngine';
import type { TextmodeEditor } from '@/textmode/editor/TextmodeEditor';
import { initAppStore, useAppStore } from '@/platform/state/appStore';
import { editorStorage, type IEditorStorage } from '@/platform/storage/EditorStorage';

import { createAppStoreAdapter, type AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { AppSettings } from '@/types';
import type { SharePayload } from '@/features/share/model/sharePayload';
import type { AppRuntimeContextValue } from './AppRuntimeContext';

/**
 * Main application composition root.
 * Orchestrates the textmode engine, share workflow, and UI.
 * Instantiated from within a React component (EditorApp).
 */
export class AppRuntime {
	private readonly storage: IEditorStorage;
	private readonly storeAdapter: AppStoreAdapter;

	private readonly textmodeEngine: TextmodeEngine;
	private readonly shareManager: ShareManager;
	private readonly uiActions: UIActions;

	/** Stable action references for React context (never change after construction). */
	readonly actions: AppRuntimeContextValue['actions'];
	/** Stable layout callbacks for React context. */
	readonly layout: AppRuntimeContextValue['layout'];

	private textmodeEditor: TextmodeEditor | null = null;
	private textmodeContainer: HTMLElement | null = null;
	private engineBootstrapPromise: Promise<void> | null = null;
	private initPromise: Promise<void> | null = null;
	private shortcuts: IShortcutsManager | null = null;
	private storeUnsubscribers: Array<() => void> = [];
	private storeInitCleanup: (() => void) | null = null;
	private initialized = false;
	private hydrationComplete = false;
	private lifecycleId = 0;
	private runnerReconnectTimer: number | null = null;

	constructor() {
		this.storage = editorStorage;
		this.storeAdapter = createAppStoreAdapter();

		// Register default code
		this.storage.setDefaultCode(defaultTextmodeSketch);

		// Create engine directly
		this.textmodeEngine = new TextmodeEngine();

		this.uiActions = new UIActions({
			storage: this.storage,
			getCode: () => this.textmodeEngine.getCode(),
			store: this.storeAdapter,
			loadExample: (code) => this.loadExample(code),
			reconnectRunners: () => this.reconnectTextmodeRunner({ runCurrentCode: true }),
			resetAll: () => this.resetAll(),
		});

		this.shareManager = new ShareManager({
			store: this.storeAdapter,
			setEditorReadOnly: (readOnly) => this.setEditorReadOnly(readOnly),
			applyPayload: (payload) => this.applySharePayload(payload),
			focusEditor: () => this.focusEditor(),
			restoreLocalSketches: () => this.restoreLocalSketches(),
			runRestoredSketches: () => this.runRestoredSketches(),
			runSharedSketch: () => this.runEngine(),
			replaceUrl: (url) => window.history.replaceState(null, '', url),
		});

		this.actions = {
			randomize: () => this.loadRandomLocalExample(),
			makeRandomChange: () => this.makeRandomChange(),
			resetRunners: () => this.uiActions.resetRunners(),
			clearStorage: () => this.uiActions.clearStorage(),
			loadExample: (code: string) => this.uiActions.loadExample(code),
			revertToLastWorking: () => {
				this.textmodeEngine.getController()?.handleRevertToLastWorking();
			},
			reconnectTextmodeRunner: () => this.reconnectTextmodeRunner(),
			unlockAndRun: () => this.shareManager.unlockAndRun(),
			unlockOnly: () => this.shareManager.unlockOnly(),
			discardShare: () => this.shareManager.discard(),
			openSharePrompt: () => this.shareManager.openPrompt(),
			copyShareExportUrl: (url: string) => this.uiActions.copyShareExportUrl(url),
			getShareExportData: () => this.uiActions.getShareExportData(),
		};

		this.layout = {
			onTextmodeReady: (container: HTMLElement) => this.handleTextmodePaneReady(container),
		};
	}

	private get settings(): AppSettings {
		return this.storeAdapter.settings.getSettings();
	}

	async init(): Promise<void> {
		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = this.initializeApp();
		return this.initPromise;
	}

	dispose(): void {
		this.lifecycleId += 1;
		this.clearRunnerReconnectTimer();
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
		this.textmodeContainer = null;
		this.engineBootstrapPromise = null;
		this.initPromise = null;
		if (this.textmodeEngine.isInitialized()) {
			this.textmodeEngine.dispose();
		}
		this.storeAdapter.engine.setIsInitialized(false);
		this.storeAdapter.engine.setRunnerUnavailable(false);
		this.storeAdapter.engine.setRunnerReconnecting(false);
		this.storeAdapter.engine.setRunnerReady(false);

		this.initialized = false;
		this.hydrationComplete = false;
	}

	// ----- Engine lifecycle (inlined from EngineLifecycle) -----

	private maybeInitializeEngine(): void {
		if (
			!this.initialized ||
			!this.hydrationComplete ||
			this.engineBootstrapPromise ||
			this.textmodeEngine.isInitialized() ||
			!this.textmodeContainer
		) {
			return;
		}

		this.engineBootstrapPromise = this.bootstrapEngine(this.textmodeContainer).finally(() => {
			this.engineBootstrapPromise = null;
		});
	}

	private async bootstrapEngine(container: HTMLElement): Promise<void> {
		await this.textmodeEngine.init(this.createEngineContext(container));
		if (!this.initialized) return;

		this.textmodeEditor = this.textmodeEngine.getEditor();
		this.applyEditorSettings();
		this.shareManager.applyInitialShareIfPresent();
		this.shareManager.attachInteractionGuards();

		if (!this.shortcuts) {
			this.shortcuts = this.createShortcutsManager();
			this.shortcuts.init();
		}

		if (this.storeUnsubscribers.length === 0) {
			this.registerStoreSubscriptions();
		}
	}

	private createEngineContext(editorContainer: HTMLElement): TextmodeEngineContext {
		return {
			editorContainer,
			visualContainer: document.body,
			getSettings: this.storeAdapter.settings.getSettings,
			store: this.storeAdapter,
			callbacks: {
				onSaveCode: (code: string) => this.storage.saveCode(code),
			},
			getInitialCode: () => this.getInitialCode(),
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

	private async initializeApp(): Promise<void> {
		if (this.initialized) {
			return this.engineBootstrapPromise ?? Promise.resolve();
		}

		const lifecycleId = this.lifecycleId;
		const loadedSettings = this.storage.loadSettings();
		this.storeAdapter.settings.setSettings(loadedSettings);
		this.shareManager.hydrateFromLocation(window.location);
		if (lifecycleId !== this.lifecycleId) {
			return;
		}

		if (!this.storeInitCleanup) {
			this.storeInitCleanup = initAppStore();
		}

		this.initialized = true;
		this.hydrationComplete = true;
		this.maybeInitializeEngine();

		return this.engineBootstrapPromise ?? Promise.resolve();
	}

	private getInitialCode(): string {
		return this.shareManager.getInitialCodeOverride() ?? this.storage.loadCode();
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

	private handleTextmodePaneReady(container: HTMLElement): void {
		this.textmodeContainer = container;
		this.maybeInitializeEngine();
	}

	private reconnectTextmodeRunner(options?: { runCurrentCode?: boolean }): void {
		if (!this.textmodeEngine.isInitialized()) return;

		this.storeAdapter.engine.setRunnerReconnecting(true);
		this.textmodeEngine.reconnectRuntime();
		if (options?.runCurrentCode) {
			this.textmodeEngine.getController()?.handleForceRun();
		}

		this.clearRunnerReconnectTimer();
		this.runnerReconnectTimer = window.setTimeout(() => {
			this.runnerReconnectTimer = null;
			this.storeAdapter.engine.setRunnerReconnecting(false);
		}, 10000);
	}

	private clearRunnerReconnectTimer(): void {
		if (this.runnerReconnectTimer === null) return;
		window.clearTimeout(this.runnerReconnectTimer);
		this.runnerReconnectTimer = null;
	}

	private resetAll(): void {
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
		const newCode = CodeRandomizer.makeRandomChange(code);

		if (code !== newCode) {
			// Avoid triggering auto-execute debounce + manual forceRun in the same click.
			this.textmodeEngine.setCode(newCode, { silent: true });
			this.textmodeEngine.getController()?.handleForceRun();
			// On mobile, avoid forcing editor focus to prevent opening the software keyboard.
			const isMobile = this.storeAdapter.ui.getIsMobile();
			if (!isMobile) {
				this.focusEditor();
			}
		}
	}

	private async loadRandomLocalExample(): Promise<boolean> {
		if (this.storeAdapter.engine.getRandomizeLoading()) return false;
		this.storeAdapter.engine.setRandomizeLoading(true);

		try {
			const examples = getExampleEngineCatalog().flatMap((engine) => Object.values(engine.examples).flat());
			if (examples.length === 0) return false;

			const currentCode = this.textmodeEngine.getCode();
			const candidates = examples.length > 1 ? examples.filter((example) => example.code !== currentCode) : examples;
			const selected = candidates[Math.floor(Math.random() * candidates.length)];
			if (!selected) return false;

			return this.loadExample(selected.code);
		} finally {
			this.storeAdapter.engine.setRandomizeLoading(false);
		}
	}
}
