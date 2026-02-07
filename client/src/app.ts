/**
 * Main application - orchestrates engines, React UI, and state.
 * Uses a single textmode.js engine for visuals and an optional Strudel engine for audio.
 */
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AppShell } from './components/AppShell';
import type { ShareExportData } from './components/ShareExportDialog';
import { type PaneConfig } from './components/EditorLayout';
import { type AppSettings } from './types/app.types';
import { type EngineId } from './types/engine.types';
import { storageService, type IStorageService } from './services/StorageService';
import { audioService } from './services/AudioService';
import { ShareService } from './services/ShareService';
import {
	fetchApprovedSketch,
	fetchRandomApprovedSketch,
	type ApprovedSketch,
} from './services/SketchApiService';
import { ShortcutsManager, type IShortcutsManager } from './managers/ShortcutsManager';
import { EditorManager } from './managers/EditorManager';
import { TextmodeEngine } from './engines/textmode/TextmodeEngine';
import { StrudelEngine } from './engines/strudel/StrudelEngine';
import { StrudelAudioSource } from './engines/strudel/audio/StrudelAudioSource';
import { useAppStore, initAppStore } from './stores/appStore';
import type { SharePayload } from './types/share.types';

/**
 * Interface for React layout state management.
 */
interface LayoutState {
	paneContainers: Map<string, HTMLElement>;
}

export class App {
	// Core services
	private storage: IStorageService = storageService;
	private shortcuts: IShortcutsManager | null = null;
	private editorManager = new EditorManager();

	// Engines
	private textmodeEngine = new TextmodeEngine();
	private strudelEngine: StrudelEngine | null = null;
	private audioUnsubscribe: (() => void) | null = null;

	// React root
	private root: Root | null = null;
	private initialized = false;
	private shareExportOpen = false;
	private shareExportData: ShareExportData | null = null;
	private randomizeLoading = false;
	private pendingApprovedSketch: ApprovedSketch | null = null;
	private showSafariActivationPrompt = false;
	private safariActivationPending = false;
	private safariActivationCancelHandler: ((event: KeyboardEvent) => void) | null = null;
	private safariActivationOverlay: HTMLElement | null = null;
	private appContainerDisplayBeforeActivation: string | null = null;

	// Layout state (managed by React, tracked for callbacks)
	private layoutState: LayoutState = {
		paneContainers: new Map(),
	};
	private paneReadyResolvers = new Map<string, (container: HTMLElement) => void>();

	// Pane configurations (generated from enabled engines)
	private paneConfigs: PaneConfig[] = [];

	// Convenience accessors
	private get settings(): AppSettings {
		return useAppStore.getState().settings;
	}

	/**
	 * Initialize the application.
	 */
	async init(): Promise<void> {
		if (this.initialized) return;
		this.initialized = true;

		// Load settings and initialize store
		const loadedSettings = this.storage.loadSettings();
		useAppStore.getState().setSettings(loadedSettings);

		// Detect shared sketch payload early to lock execution before runtimes start
		// SECURITY: Check for share hash FIRST. If present, it MUST go through consent dialog.
		// This prevents malicious URLs like /s/trusted-slug#share=malicious from bypassing security.
		const sharedPayload = ShareService.getFromLocation(window.location);

		if (sharedPayload) {
			// URL hash-based share always requires user consent, regardless of slug path
			useAppStore.getState().setSharePayload(sharedPayload);
		} else {
			// Only process slug if there's NO share hash
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

		// Build initial panes and panels
		this.updatePanesAndPanels(loadedSettings);

		// Initialize UI store with resize listener
		initAppStore();

		// Create React root
		const appContainer = document.getElementById('app-container');
		if (!appContainer) {
			console.error('App container #app-container not found');
			return;
		}
		this.root = createRoot(appContainer);

		// Render and wait for pane containers
		this.render();
		await this.waitForPanes(this.paneConfigs.map((pane) => pane.id));

		// Initialize textmode engine (always on)
		await this.initTextmodeEngine();
		this.showSafariActivationPrompt = this.shouldOfferSafariActivation();
		this.render();

		// Initialize Strudel if enabled
		if (loadedSettings.strudelEnabled) {
			await this.enableStrudel();
		}

		// Apply initial settings to all editors
		this.editorManager.applySettings(this.settings);
		this.applySharedSketchIfPresent();
		this.applyPendingApprovedSketchIfPresent();
		this.setupShareInteractionGuards();

		// Setup shortcuts
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

		// Subscribe to settings changes
		useAppStore.subscribe(
			(state) => state.settings,
			(settings, previous) => {
				this.storage.saveSettings(settings);
				this.editorManager.applySettings(settings);

				if (!previous || settings.strudelEnabled !== previous.strudelEnabled) {
					void this.setStrudelEnabled(settings.strudelEnabled);
				}
			}
		);

		// Subscribe to UI visibility changes to toggle app container
		useAppStore.subscribe(
			(state) => state.settings.uiVisible,
			(uiVisible) => {
				const container = document.getElementById('app-container');
				if (container) {
					container.style.display = uiVisible ? '' : 'none';
				}
			}
		);
	}

	/**
	 * Get props for the shell UI layer.
	 */
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
			onShareUnlockAndRun: () => this.handleShareUnlockAndRun(),
			onShareUnlockOnly: () => this.handleShareUnlockOnly(),
			onShareDiscard: () => this.handleShareDiscard(),
			onSharePromptOpen: () => this.openShareConsentPrompt(),
			shareExportOpen: this.shareExportOpen,
			shareExportData: this.shareExportData,
			onShareExportOpenChange: (open: boolean) => this.handleShareExportOpenChange(open),
			onShareExportCopy: (url: string) => this.handleShareExportCopy(url),
			showSafariActivationPrompt: this.showSafariActivationPrompt,
			onSafariActivation: () => this.beginSafariActivation(),
		};
	}

	/**
	 * Render the unified React app.
	 */
	private render(): void {
		if (!this.root) return;

		this.root.render(
			createElement(AppShell, {
				panes: this.paneConfigs,
				editorBackdrop: this.settings.editorBackdrop,
				onPaneReady: (paneId: string, container: HTMLElement) => {
					this.layoutState.paneContainers.set(paneId, container);
					const resolver = this.paneReadyResolvers.get(paneId);
					if (resolver) {
						resolver(container);
						this.paneReadyResolvers.delete(paneId);
					}
				},
				...this.getShellProps(),
			})
		);
	}

	/**
	 * Initialize the textmode engine.
	 */
	private async initTextmodeEngine(): Promise<void> {
		useAppStore.getState().initEngineState('textmode');
		const container = await this.waitForPane('textmode');

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

		this.textmodeEngine.getRuntime()?.setOnUserInteraction(() => this.handleRunnerUserInteraction());

		const editor = this.textmodeEngine.getEditor();
		if (editor) {
			this.editorManager.registerEditor('textmode', editor);
		}
	}

	/**
	 * Enable the Strudel engine (creates editor + runtime).
	 */
	private async enableStrudel(): Promise<void> {
		if (this.strudelEngine) return;

		useAppStore.getState().initEngineState('strudel');
		const container = await this.waitForPane('strudel');

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
		this.applySharedSketchIfPresent();
		const approvedSketch = useAppStore.getState().approvedSketch;
		if (approvedSketch?.strudelCode) {
			this.strudelEngine.setCode(approvedSketch.strudelCode, { silent: true });
			this.strudelEngine.getRuntime()?.forceRun(approvedSketch.strudelCode);
		} else if (approvedSketch) {
			this.strudelEngine.hush();
		}
		this.startAudioReactivity();
	}

	/**
	 * Disable the Strudel engine and stop audio reactivity.
	 */
	private disableStrudel(): void {
		if (!this.strudelEngine) return;

		this.strudelEngine.hush();
		this.stopAudioReactivity();

		this.editorManager.unregisterEditor('strudel');
		this.strudelEngine.dispose();
		this.strudelEngine = null;
		this.layoutState.paneContainers.delete('strudel');
		useAppStore.getState().setEngineInitialized('strudel', false);
		useAppStore.getState().setEngineCustomState('strudel', 'state', {
			isPlaying: false,
			isInitialized: false,
		});
	}

	/**
	 * Toggle Strudel on/off without requiring a refresh.
	 */
	private async setStrudelEnabled(enabled: boolean): Promise<void> {
		this.updatePanesAndPanels(this.settings);
		this.render();

		if (enabled) {
			await this.waitForPanes(this.paneConfigs.map((pane) => pane.id));
			await this.enableStrudel();
		} else {
			this.disableStrudel();
		}
	}

	/**
	 * Update pane configs + panel labels based on settings.
	 */
	private updatePanesAndPanels(settings: AppSettings): void {
		this.paneConfigs = this.buildPaneConfigs(settings);

		const panels = [
			{ id: 'textmode', label: 'textmode.js' },
			...(settings.strudelEnabled ? [{ id: 'strudel', label: 'strudel' }] : []),
		];
		useAppStore.getState().setPanels(panels);

		const activePanel = useAppStore.getState().activePanel;
		if (!panels.find((panel) => panel.id === activePanel)) {
			useAppStore.getState().setActivePanel(panels[0]?.id ?? '');
		}
	}

	private buildPaneConfigs(settings: AppSettings): PaneConfig[] {
		const panes: PaneConfig[] = [
			{ id: 'textmode', engineId: 'textmode' },
		];

		if (settings.strudelEnabled) {
			panes.push({ id: 'strudel', engineId: 'strudel' });
		}

		return panes;
	}

	private shouldOfferSafariActivation(): boolean {
		const ua = navigator.userAgent;
		const isWebKit = /AppleWebKit/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR/i.test(ua);
		const isMacOS = /Macintosh/i.test(ua);
		return isWebKit && isMacOS;
	}

	private beginSafariActivation(): void {
		if (this.safariActivationPending) return;

		this.safariActivationPending = true;
		this.mountSafariActivationOverlay();
		this.hideAppContainerForActivation();
		this.render();
		this.safariActivationCancelHandler = (event: KeyboardEvent): void => {
			if (event.key !== 'Escape') return;
			this.endSafariActivation({ activated: false });
		};
		window.addEventListener('keydown', this.safariActivationCancelHandler, true);
	}

	private handleRunnerUserInteraction(): void {
		if (!this.safariActivationPending) return;
		this.textmodeEngine.getRuntime()?.activateFromUserGesture();
		this.endSafariActivation({ activated: true });
	}

	private endSafariActivation(options: { activated: boolean }): void {
		if (this.safariActivationCancelHandler) {
			window.removeEventListener('keydown', this.safariActivationCancelHandler, true);
			this.safariActivationCancelHandler = null;
		}
		this.unmountSafariActivationOverlay();
		this.restoreAppContainerAfterActivation();
		this.safariActivationPending = false;
		if (options.activated) {
			this.showSafariActivationPrompt = false;
		}
		this.render();
	}

	private mountSafariActivationOverlay(): void {
		if (this.safariActivationOverlay) return;

		const overlay = document.createElement('div');
		overlay.id = 'safari-activation-overlay';
		overlay.innerHTML = [
			'<div class="safari-activation-overlay-card">',
			'<div class="safari-activation-overlay-kicker">safari canvas setup</div>',
			'<div class="safari-activation-overlay-title">click the background once to unlock smooth rendering</div>',
			'<div class="safari-activation-overlay-body">the ui is temporarily hidden so your click goes directly to the moving canvas.</div>',
			'<div class="safari-activation-overlay-hint">if motion still feels capped, click the background one more time.</div>',
			'<div class="safari-activation-overlay-shortcut">tip: press ctrl+shift+h any time to hide editors and click the canvas manually.</div>',
			'<div class="safari-activation-overlay-meta">press esc to cancel</div>',
			'</div>',
		].join('');

		document.body.appendChild(overlay);
		this.safariActivationOverlay = overlay;
	}

	private unmountSafariActivationOverlay(): void {
		if (!this.safariActivationOverlay) return;
		this.safariActivationOverlay.remove();
		this.safariActivationOverlay = null;
	}

	private hideAppContainerForActivation(): void {
		const appContainer = document.getElementById('app-container');
		if (!appContainer) return;

		this.appContainerDisplayBeforeActivation = appContainer.style.display;
		appContainer.style.display = 'none';
	}

	private restoreAppContainerAfterActivation(): void {
		const appContainer = document.getElementById('app-container');
		if (!appContainer) return;

		appContainer.style.display = this.appContainerDisplayBeforeActivation ?? '';
		this.appContainerDisplayBeforeActivation = null;
	}

	/**
	 * Start audio reactivity pipeline (Strudel -> Textmode).
	 */
	private startAudioReactivity(): void {
		if (this.audioUnsubscribe) return;
		const source = new StrudelAudioSource();
		audioService.setSource(source);
		this.audioUnsubscribe = audioService.subscribe((data) => {
			this.textmodeEngine.sendAudioData(data);
		});
		audioService.start();
	}

	/**
	 * Stop audio reactivity and clear audio globals.
	 */
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

	/**
	 * Wait for a specific pane container.
	 */
	private waitForPane(paneId: string): Promise<HTMLElement> {
		const container = this.layoutState.paneContainers.get(paneId);
		if (container) return Promise.resolve(container);

		return new Promise((resolve) => {
			this.paneReadyResolvers.set(paneId, resolve);
		});
	}

	/**
	 * Wait for multiple panes to be ready.
	 */
	private async waitForPanes(paneIds: string[]): Promise<void> {
		await Promise.all(paneIds.map((id) => this.waitForPane(id)));
	}

	private applyPendingApprovedSketchIfPresent(): void {
		if (!this.pendingApprovedSketch) return;
		const sketch = this.pendingApprovedSketch;
		this.pendingApprovedSketch = null;
		this.applyApprovedSketch(sketch);
	}

	private applyApprovedSketch(sketch: ApprovedSketch): void {
		const store = useAppStore.getState();
		if (store.share.payload) {
			store.setSharePayload(null);
			this.setEditorsReadOnly(false);
		}

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

	private applySharedSketchIfPresent(): void {
		const share = useAppStore.getState().share;
		if (!share.payload || share.consented) return;
		this.applySharePayload(share.payload);
		this.setEditorsReadOnly(true);
	}

	private applySharePayload(payload: SharePayload): void {
		if (payload.engines.textmode !== undefined) {
			this.textmodeEngine.setCode(payload.engines.textmode, { silent: true });
		}

		if (payload.engines.strudel !== undefined && this.strudelEngine) {
			this.strudelEngine.setCode(payload.engines.strudel, { silent: true });
		}
	}

	private setEditorsReadOnly(readOnly: boolean): void {
		this.editorManager.setReadOnly(readOnly);
	}

	private handleShareUnlockAndRun(): void {
		this.unlockSharedSketch();
		this.runSharedSketch();
	}

	private handleShareUnlockOnly(): void {
		this.viewSharedSketchOnly();
	}

	private unlockSharedSketch(): void {
		const share = useAppStore.getState().share;
		if (!share.payload) return;
		useAppStore.getState().setShareConsented(true);
		this.setEditorsReadOnly(false);
		this.applySharePayload(share.payload);
		this.focusSharedEditor(share.payload);
	}

	private viewSharedSketchOnly(): void {
		const share = useAppStore.getState().share;
		if (!share.payload) return;
		useAppStore.getState().setSharePromptOpen(false);
		this.setEditorsReadOnly(true);
		this.applySharePayload(share.payload);
	}

	private openShareConsentPrompt(): void {
		const share = useAppStore.getState().share;
		if (!share.payload || share.consented) return;
		useAppStore.getState().setSharePromptOpen(true);
	}

	private focusSharedEditor(payload: SharePayload): void {
		if (payload.engines.textmode !== undefined) {
			this.editorManager.focusEditor('textmode');
			return;
		}
		if (payload.engines.strudel !== undefined) {
			this.editorManager.focusEditor('strudel');
		}
	}

	private handleShareDiscard(): void {
		const share = useAppStore.getState().share;
		if (!share.payload) return;
		useAppStore.getState().setSharePayload(null);
		this.setEditorsReadOnly(false);
		this.restoreLocalSketches();
		this.runRestoredSketches();
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

	private runSharedSketch(): void {
		const payload = useAppStore.getState().share.payload;
		if (!payload) return;

		if (payload.engines.textmode !== undefined) {
			this.textmodeEngine.getController()?.handleForceRun();
		}

		if (payload.engines.strudel !== undefined && this.strudelEngine) {
			this.strudelEngine.getController()?.handleForceRun();
		}
	}

	/**
	 * Handle share button.
	 */
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

	/**
	 * Handle clear storage.
	 */
	private handleClearStorage(): void {
		this.storage.clearCode();
		this.resetAll();
	}

	/**
	 * Handle loading an example sketch.
	 */
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

	/**
	 * Reset engines to defaults and hush audio.
	 */
	private resetAll(): void {
		useAppStore.getState().setEngineLastWorkingCode('textmode', null);
		this.textmodeEngine.setCode(this.textmodeEngine.getDefaultCode());

		useAppStore.getState().setEngineLastWorkingCode('strudel', null);
		if (this.strudelEngine) {
			this.strudelEngine.setCode(this.strudelEngine.getDefaultCode());
			this.strudelEngine.hush();
		}
	}

	/**
	 * Toggle UI visibility.
	 */
	private toggleUIVisibility(): void {
		const newVisibility = !this.settings.uiVisible;
		const s = this.settings;
		useAppStore.getState().setSettings({ ...s, uiVisible: newVisibility });
	}

	/**
	 * Handle font size change.
	 */
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

	private setupShareInteractionGuards(): void {
		document.addEventListener('mousedown', this.handleShareInteraction, true);
		document.addEventListener('keydown', this.handleShareKeydown, true);
	}

	private handleShareInteraction = (event: MouseEvent): void => {
		const share = useAppStore.getState().share;
		if (!share.payload || share.consented || share.promptOpen) return;
		const target = event.target as HTMLElement | null;
		if (!target) return;
		if (target.closest('.monaco-editor')) {
			useAppStore.getState().setSharePromptOpen(true);
		}
	};

	private handleShareKeydown = (event: KeyboardEvent): void => {
		const share = useAppStore.getState().share;
		if (!share.payload || share.consented || share.promptOpen) return;
		const target = event.target as HTMLElement | null;
		if (!target) return;
		if (target.closest('.monaco-editor')) {
			useAppStore.getState().setSharePromptOpen(true);
		}
	};

	private getEngine(engineId: EngineId): TextmodeEngine | StrudelEngine | null {
		if (engineId === 'textmode') return this.textmodeEngine;
		if (engineId === 'strudel') return this.strudelEngine;
		return null;
	}
}
