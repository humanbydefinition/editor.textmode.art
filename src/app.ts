/**
 * Main application - orchestrates engines, React UI, and state.
 * Uses a single textmode.js engine for visuals and an optional Strudel engine for audio.
 */
import { createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AppShell } from './components/AppShell';
import { type PaneConfig } from './components/EditorLayout';
import { type MouseSonarHandle } from './components/MouseSonar';
import { type AppSettings } from './types/app.types';
import { type EngineId } from './types/engine.types';
import { storageService, type IStorageService } from './services/StorageService';
import { audioService } from './services/AudioService';
import { ShareService } from './services/ShareService';
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
	private sonarRef = createRef<MouseSonarHandle>();
	private initialized = false;

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
		const sharedPayload = ShareService.getFromLocation(window.location);
		if (sharedPayload) {
			useAppStore.getState().setSharePayload(sharedPayload);
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

		// Initialize Strudel if enabled
		if (loadedSettings.strudelEnabled) {
			await this.enableStrudel();
		}

		// Apply initial settings to all editors
		this.editorManager.applySettings(this.settings);
		this.applySharedSketchIfPresent();

		// Setup shortcuts
		this.shortcuts = new ShortcutsManager({
			actions: {
				triggerSonarPing: () => this.sonarRef.current?.ping(),
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
			onClearStorage: () => this.handleClearStorage(),
			onLoadExample: (code: string, engineId: string) => this.handleLoadExample(code, engineId),
			onRevertToLastWorking: handleRevert,
			onShareUnlockAndRun: () => this.handleShareUnlockAndRun(),
			onShareUnlockOnly: () => this.handleShareUnlockOnly(),
			onShareDiscard: () => this.handleShareDiscard(),
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
				sonarRef: this.sonarRef,
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
		this.unlockSharedSketch();
	}

	private unlockSharedSketch(): void {
		const share = useAppStore.getState().share;
		if (!share.payload) return;
		useAppStore.getState().setShareConsented(true);
		this.setEditorsReadOnly(false);
		this.applySharePayload(share.payload);
		this.focusSharedEditor(share.payload);
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
	}

	private restoreLocalSketches(): void {
		const textmodeCode = this.storage.loadEngineCode('textmode');
		this.textmodeEngine.setCode(textmodeCode, { silent: true });

		if (this.strudelEngine) {
			const strudelCode = this.storage.loadEngineCode('strudel');
			this.strudelEngine.setCode(strudelCode, { silent: true });
		}
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
		const payload: SharePayload = {
			v: 1,
			createdAt: Date.now(),
			engines: {
				textmode: this.textmodeEngine.getCode(),
			},
		};

		if (this.strudelEngine) {
			payload.engines.strudel = this.strudelEngine.getCode();
		}

		const encoded = ShareService.encode(payload);
		const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`;

		this.copyToClipboard(shareUrl);
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

	private getEngine(engineId: EngineId): TextmodeEngine | StrudelEngine | null {
		if (engineId === 'textmode') return this.textmodeEngine;
		if (engineId === 'strudel') return this.strudelEngine;
		return null;
	}
}
