import { ShareManager, type ShareExportData } from '@/features/share';
import { GalleryManager, type GallerySketch } from '@/features/gallery-sketches';
import { installShortcuts, type ShortcutActions } from '@/platform/input/shortcuts';
import { makeRandomChange } from './CodeRandomizer';
import { TextmodeEngine, type TextmodeEngineContext } from '@/textmode/TextmodeEngine';
import { useAppStore } from '@/platform/state/appStore';
import { EditorStorage, editorStorage } from '@/platform/storage/EditorStorage';
import { AudioInputController } from '@/platform/audio/AudioInputController';
import { WebMcpRegistrar, WebMcpToolService, type EditorAgentCapabilities } from '@/features/webmcp';

import { MOBILE_BREAKPOINT, type AppSettings } from '@/types';
import type { SharePayload } from '@/features/share/model/sharePayload';

const getAppState = useAppStore.getState;

/**
 * Main application composition root.
 * Orchestrates the textmode engine, share workflow, and UI.
 * Instantiated from within a React component (EditorApp).
 */
export class AppRuntime {
	private readonly storage: EditorStorage;

	private readonly textmodeEngine: TextmodeEngine;
	private readonly shareManager: ShareManager;
	private readonly galleryManager: GalleryManager;
	private readonly audioInput: AudioInputController;
	private readonly webMcpService: WebMcpToolService;
	private readonly webMcpRegistrar: WebMcpRegistrar;
	private readonly shareExportListeners = new Set<() => void>();

	/** Stable action references for React context (never change after construction). */
	readonly actions;
	/** Stable layout callbacks for React context. */
	readonly layout;

	private textmodeContainer: HTMLElement | null = null;
	private removeShortcuts: (() => void) | null = null;
	private storeUnsubscribers: Array<() => void> = [];
	private initialized = false;
	private lifecycleId = 0;
	private runnerReconnectTimer: number | null = null;

	constructor() {
		this.storage = editorStorage;

		// Create engine directly
		this.textmodeEngine = new TextmodeEngine();
		this.audioInput = new AudioInputController();

		this.shareManager = new ShareManager({
			getShare: () => getAppState().share,
			setSharePayload: (payload) => getAppState().setSharePayload(payload),
			setShareConsented: (consented) => getAppState().setShareConsented(consented),
			setSharePromptOpen: (open) => getAppState().setSharePromptOpen(open),
			setEditorReadOnly: (readOnly) => this.setEditorReadOnly(readOnly),
			applyPayload: (payload) => this.applySharePayload(payload),
			focusEditor: () => this.focusEditor(),
			restoreMainSketch: () => this.restoreMainSketch(),
			runCode: () => this.textmodeEngine.run(),
			replaceUrl: (url) => window.history.replaceState(null, '', url),
		});

		this.galleryManager = new GalleryManager({
			getGallerySketch: () => getAppState().gallerySketch,
			getOriginalGallerySketch: () => getAppState().originalGallerySketch,
			setGallerySketch: (sketch) => getAppState().setGallerySketch(sketch),
			clearGallerySketches: () => getAppState().clearGallerySketches(),
			setSharePayload: (payload) => getAppState().setSharePayload(payload),
			setError: (error) => getAppState().setError(error),
			applyGallerySketch: (sketch) => this.applyGallerySketch(sketch),
			replaceUrl: (url) => window.history.replaceState(null, '', url),
		});

		const agentCapabilities: EditorAgentCapabilities = {
			getCode: () => this.textmodeEngine.getCode(),
			getRevision: () => this.agentEngine().getRevision?.() ?? 0,
			validateCode: (code, signal) =>
				this.agentEngine().validateCode?.(code, signal) ??
				Promise.resolve({ valid: false, diagnostic: { message: 'Runner is not ready' } }),
			previewCandidate: (code, baseline, revision) =>
				this.agentEngine().previewCandidate?.(code, baseline, revision) ?? Promise.resolve(false),
			acceptPreviewedCandidate: () => this.agentEngine().acceptPreviewedCandidate?.() ?? false,
			restoreAcceptedCode: () => this.agentEngine().restoreAcceptedCode?.(),
			getRunnerCapabilities: () => this.agentEngine().getRunnerCapabilities?.() ?? {},
			inspectArtwork: (input, signal) =>
				this.agentEngine().inspectArtwork?.(input, signal) ?? Promise.reject(new Error('Runner is not ready')),
			prepareExport: (input, signal) =>
				this.agentEngine().prepareExport?.(input, signal) ?? Promise.reject(new Error('Runner is not ready')),
			openShare: () => this.requestShareExport(),
			getState: () => getAppState(),
			setProposal: (proposal) => getAppState().setAgentProposal(proposal),
			setPreparedExport: (artifact) => getAppState().setPreparedExport(artifact),
			log: (entry) => getAppState().appendAgentActivity(entry),
		};
		this.webMcpService = new WebMcpToolService(agentCapabilities);
		this.webMcpRegistrar = new WebMcpRegistrar(this.webMcpService, (support, names) => {
			getAppState().setAgentSupport(support);
			getAppState().setRegisteredAgentTools(names);
		});

		this.actions = {
			randomize: () => this.loadRandomGallerySketch(),
			makeRandomChange: () => this.makeRandomChange(),
			reloadSandbox: () => this.reloadTextmodeSandbox(),
			hasLocalSketch: () => this.hasLocalSketch(),
			restoreLocalSketch: () => this.restoreLocalSketch(),
			revertToLastWorking: () => this.textmodeEngine.revertToLastWorking(),
			enableAudioInput: (deviceId?: string) => this.audioInput.enable(deviceId),
			disableAudioInput: () => this.audioInput.disable(),
			refreshAudioInputDevices: () => this.audioInput.refresh(),
			selectAudioInputDevice: (deviceId: string) => this.audioInput.select(deviceId),
			unlockAndRun: () => this.shareManager.unlockAndRun(),
			unlockOnly: () => this.shareManager.unlockOnly(),
			discardShare: () => this.shareManager.discard(),
			openSharePrompt: () => this.shareManager.openPrompt(),
			keepShareLocked: () => this.shareManager.keepLocked(),
			copyShareExportUrl: (url: string) => this.copyShareExportUrl(url),
			getShareExportData: () => this.getShareExportData(),
			onRequestShareExport: (listener: () => void) => this.subscribeShareExport(listener),
			previewAgentProposal: () => this.webMcpService.preview(),
			acceptAgentProposal: () => this.webMcpService.accept(),
			rejectAgentProposal: () => this.webMcpService.reject(),
			downloadPreparedExport: () => this.webMcpService.download(),
			closePreparedExport: () => this.webMcpService.closeExport(),
		};

		this.layout = {
			onTextmodeReady: (container: HTMLElement) => this.handleTextmodePaneReady(container),
		};
	}

	private get settings(): AppSettings {
		return getAppState().settings;
	}

	init(): void {
		if (this.initialized) return;

		this.audioInput.init((frame) => {
			this.textmodeEngine.sendAudioData({
				fft: frame.fft,
				waveform: frame.waveform,
				timestamp: frame.timestamp,
			});
		});
		this.initializeApp();
	}

	dispose(): void {
		this.lifecycleId += 1;
		this.clearRunnerReconnectTimer();
		this.removeShortcuts?.();
		this.removeShortcuts = null;
		this.audioInput.dispose();
		this.shareManager.dispose();
		this.webMcpRegistrar.dispose();
		this.webMcpService.dispose();
		this.shareExportListeners.clear();

		for (const unsubscribe of this.storeUnsubscribers) {
			unsubscribe();
		}
		this.storeUnsubscribers = [];

		this.textmodeContainer = null;
		if (this.textmodeEngine.isInitialized()) {
			this.textmodeEngine.dispose();
		}
		getAppState().setRunnerStatus('connected');
		getAppState().setAgentSupport('unsupported');
		getAppState().setRegisteredAgentTools([]);

		this.initialized = false;
	}

	// ----- Engine lifecycle (inlined from EngineLifecycle) -----

	private maybeInitializeEngine(): void {
		if (!this.initialized || this.textmodeEngine.isInitialized() || !this.textmodeContainer) {
			return;
		}

		this.bootstrapEngine(this.textmodeContainer);
	}

	private bootstrapEngine(container: HTMLElement): void {
		this.textmodeEngine.init(this.createEngineContext(container));
		this.reconcileWebMcp();
		if (!this.initialized) return;

		this.shareManager.setInitialReadOnlyIfNeeded();
		this.shareManager.attachInteractionGuards();

		if (!this.removeShortcuts) {
			this.removeShortcuts = installShortcuts(this.createShortcutActions());
		}

		if (this.storeUnsubscribers.length === 0) {
			this.registerStoreSubscriptions();
		}
	}

	private createEngineContext(editorContainer: HTMLElement): TextmodeEngineContext {
		const lifecycleId = this.lifecycleId;
		return {
			editorContainer,
			visualContainer: document.body,
			getSettings: () => getAppState().settings,
			controllerState: {
				clearError: () => getAppState().setError(null),
				setError: (error) => getAppState().setError(error),
				getLastWorkingCode: () => getAppState().lastWorkingCode,
				setLastWorkingCode: (code) => getAppState().setLastWorkingCode(code),
			},
			isExecutionLocked: () => this.shareManager.lockExecutionIfNeeded(),
			onCodeChanged: (code) => {
				this.webMcpService.invalidate();
				this.galleryManager.syncActiveSketchWithCode(code);
			},
			callbacks: {
				onSaveCode: (code: string) => this.storage.saveCode(code),
			},
			getInitialCode: () => this.getInitialCode(),
			toggleUI: () => this.toggleUIVisibility(),
			changeFontSize: (delta) => this.changeFontSize(delta),
			onRunnerConnected: () => {
				if (this.lifecycleId !== lifecycleId) return;
				getAppState().setRunnerStatus('connected');
				this.reconcileWebMcp();
			},
			onRunnerDisconnected: () => {
				if (this.lifecycleId !== lifecycleId) return;
				getAppState().setRunnerStatus('unavailable');
				this.reconcileWebMcp();
			},
		};
	}

	private initializeApp(): void {
		if (this.initialized) return;

		const loadedSettings = this.storage.loadSettings();
		getAppState().setSettings(loadedSettings);
		this.shareManager.hydrateFromLocation(window.location);
		if (!getAppState().share.payload) {
			this.galleryManager.hydrateFromLocation(window.location);
			this.replaceUnknownEditorPath(window.location);
			this.loadInitialRandomGallerySketchIfNeeded();
		} else {
			this.galleryManager.clear();
		}

		this.initialized = true;
		this.maybeInitializeEngine();
	}

	private getInitialCode(): string {
		return (
			getAppState().share.payload?.engines.textmode ??
			getAppState().gallerySketch?.textmodeCode ??
			this.storage.loadCode() ??
			''
		);
	}

	private getShareExportData(): ShareExportData {
		return {
			createdAt: Date.now(),
			textmodeCode: this.textmodeEngine.getCode(),
		};
	}

	private subscribeShareExport(listener: () => void): () => void {
		this.shareExportListeners.add(listener);
		return () => this.shareExportListeners.delete(listener);
	}

	private requestShareExport(): void {
		for (const listener of this.shareExportListeners) listener();
	}

	private reconcileWebMcp(): void {
		const share = getAppState().share;
		this.webMcpRegistrar.reconcile({
			initialized: this.textmodeEngine.isInitialized(),
			locked: Boolean(share.payload && !share.consented),
			capabilities: this.agentEngine().getRunnerCapabilities?.() ?? {},
		});
	}

	private agentEngine(): {
		getRevision?: () => number;
		validateCode?: (
			code: string,
			signal?: AbortSignal
		) => Promise<{ valid: boolean; diagnostic?: { message: string; line?: number; column?: number } }>;
		previewCandidate?: (code: string, baseline: string, revision: number) => Promise<boolean>;
		acceptPreviewedCandidate?: () => boolean;
		restoreAcceptedCode?: () => void;
		getRunnerCapabilities?: () => Record<string, boolean>;
		inspectArtwork?: (input: unknown, signal?: AbortSignal) => Promise<unknown>;
		prepareExport?: (input: unknown, signal?: AbortSignal) => Promise<unknown>;
	} {
		return this.textmodeEngine as unknown as ReturnType<AppRuntime['agentEngine']>;
	}

	private copyShareExportUrl(url: string): void {
		if (navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(url).catch(() => this.fallbackCopy(url));
			return;
		}
		this.fallbackCopy(url);
	}

	private fallbackCopy(value: string): void {
		window.prompt('Copy this link to share your sketch:', value);
	}

	private toggleUIVisibility(): void {
		getAppState().updateSettings({ uiVisible: !this.settings.uiVisible });
	}

	private changeFontSize(delta: number): void {
		const fontSize = Math.min(32, Math.max(10, this.settings.fontSize + delta));
		if (fontSize !== this.settings.fontSize) {
			getAppState().updateSettings({ fontSize });
		}
	}

	private applySharePayload(payload: SharePayload): void {
		if (!this.textmodeEngine.isInitialized()) return;
		const code = payload.engines.textmode;
		if (typeof code !== 'string') return;
		this.textmodeEngine.setCode(code, { silent: true });
	}

	private hasLocalSketch(): boolean {
		return this.storage.loadCode() !== null;
	}

	private restoreLocalSketch(): boolean {
		if (!this.textmodeEngine.isInitialized() || !getAppState().gallerySketch) return false;
		const code = this.storage.loadCode();
		if (code === null) return false;

		this.galleryManager.clear();
		this.replaceEditorUrl('/');
		this.textmodeEngine.replaceAndRun(code, 'reset-runtime');
		return true;
	}

	private restoreMainSketch(): void {
		if (!this.textmodeEngine.isInitialized()) return;

		const code = this.storage.loadCode();
		if (code !== null) {
			this.galleryManager.clear();
			this.replaceEditorUrl('/');
			this.textmodeEngine.replaceAndRun(code, 'reset-runtime');
			return;
		}

		this.galleryManager.clear();
		this.loadRandomGallerySketch();
	}

	private setEditorReadOnly(readOnly: boolean): void {
		this.textmodeEngine.setReadOnly(readOnly);
	}

	private focusEditor(): void {
		this.textmodeEngine.focus();
	}

	private handleTextmodePaneReady(container: HTMLElement): void {
		this.textmodeContainer = container;
		this.maybeInitializeEngine();
	}

	private applyGallerySketch(sketch: GallerySketch): void {
		if (!this.textmodeEngine.isInitialized()) return;

		const code = sketch.textmodeCode;
		this.textmodeEngine.replaceAndRun(code, 'reset-runtime');
	}

	private reloadTextmodeSandbox(): void {
		if (!this.textmodeEngine.isInitialized()) return;

		this.textmodeEngine.reloadSandbox();
		this.markRunnerReconnecting();
	}

	private markRunnerReconnecting(): void {
		getAppState().setRunnerStatus('reconnecting');
		this.clearRunnerReconnectTimer();
		this.runnerReconnectTimer = window.setTimeout(() => {
			this.runnerReconnectTimer = null;
			if (getAppState().runnerStatus === 'reconnecting') {
				getAppState().setRunnerStatus('unavailable');
			}
		}, 10000);
	}

	private clearRunnerReconnectTimer(): void {
		if (this.runnerReconnectTimer === null) return;
		window.clearTimeout(this.runnerReconnectTimer);
		this.runnerReconnectTimer = null;
	}

	// ----- End engine lifecycle -----

	private createShortcutActions(): ShortcutActions {
		return {
			changeFontSize: (delta) => this.changeFontSize(delta),
			toggleAutoExecute: () => {
				const s = this.settings;
				getAppState().updateSettings({ autoExecute: !s.autoExecute });
			},
			toggleEditorBackdrop: () => {
				const s = this.settings;
				getAppState().updateSettings({ editorBackdrop: !s.editorBackdrop });
			},
			hardReset: () => this.textmodeEngine.resetRuntime(),
			toggleUIVisibility: () => this.toggleUIVisibility(),
		};
	}

	private registerStoreSubscriptions(): void {
		const settingsUnsubscribe = useAppStore.subscribe(
			(state) => state.settings,
			(settings) => {
				this.storage.saveSettings(settings);
				this.textmodeEngine.updateSettings(settings);
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

		this.storeUnsubscribers.push(
			useAppStore.subscribe(
				(state) => state.share,
				() => this.reconcileWebMcp()
			)
		);
	}

	private async makeRandomChange(): Promise<boolean> {
		const code = this.textmodeEngine.getCode();
		const newCode = makeRandomChange(code);

		if (code === newCode) return false;

		const accepted = await this.textmodeEngine.tryReplaceAndRun(newCode);
		if (accepted) {
			getAppState().setGallerySketch(null);
			// On mobile, avoid forcing editor focus to prevent opening the software keyboard.
			if (window.innerWidth > MOBILE_BREAKPOINT) {
				this.focusEditor();
			}
		}

		return accepted;
	}

	private loadRandomGallerySketch(): boolean {
		if (!this.textmodeEngine.isInitialized()) return false;
		return this.galleryManager.loadRandom();
	}

	private loadInitialRandomGallerySketchIfNeeded(): void {
		if (window.location.pathname !== '/' || getAppState().gallerySketch || this.hasLocalSketch()) return;
		this.galleryManager.loadRandom();
	}

	private replaceUnknownEditorPath(location: Location): void {
		if (location.pathname === '/') return;
		if (getAppState().gallerySketch) return;
		this.replaceEditorUrl('/');
	}

	private replaceEditorUrl(url: string): void {
		window.history.replaceState(null, '', url);
	}
}
