import { ShareManager } from '@/features/share';
import { GalleryManager, type GallerySketch } from '@/features/gallery-sketches';
import { UIActions } from '@/app/runtime/UIActions';
import { ShortcutsManager, type IShortcutsManager } from '@/platform/input/ShortcutsManager';
import { CodeRandomizer } from './CodeRandomizer';
import { defaultTextmodeSketch } from '@/features/examples/content/default-sketches';
import { TextmodeEngine, type TextmodeEngineContext } from '@/textmode/TextmodeEngine';
import type { TextmodeEditor } from '@/textmode/editor/TextmodeEditor';
import { initAppStore, useAppStore } from '@/platform/state/appStore';
import { editorStorage, type IEditorStorage } from '@/platform/storage/EditorStorage';
import { AudioInputService, type AudioInputFrame } from '@/platform/audio/AudioInputService';

import { createAppStoreAdapter, type AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { AudioInputErrorState, AudioInputPermission } from '@/platform/state/slices/audioSlice';
import type { AppSettings } from '@/types';
import type { SharePayload } from '@/features/share/model/sharePayload';
import type { AppRuntimeContextValue } from './AppRuntimeContext';

const AUDIO_LEVEL_UI_INTERVAL_MS = 1000 / 12;

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
	private readonly galleryManager: GalleryManager;
	private readonly uiActions: UIActions;
	private readonly audioInputService: AudioInputService;

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
	private audioInputUnsubscribe: (() => void) | null = null;
	private audioDeviceChangeUnsubscribe: (() => void) | null = null;
	private storeInitCleanup: (() => void) | null = null;
	private initialized = false;
	private hydrationComplete = false;
	private lifecycleId = 0;
	private creationLifecycleId: number;
	private runnerReconnectTimer: number | null = null;
	private lastAudioLevelUiUpdateAt = 0;

	constructor() {
		this.creationLifecycleId = this.lifecycleId;
		this.storage = editorStorage;
		this.storeAdapter = createAppStoreAdapter();

		// Register default code
		this.storage.setDefaultCode(defaultTextmodeSketch);

		// Create engine directly
		this.textmodeEngine = new TextmodeEngine();
		this.audioInputService = new AudioInputService();
		this.attachAudioInputService();

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

		this.galleryManager = new GalleryManager({
			store: this.storeAdapter,
			applyGallerySketch: (sketch) => this.applyGallerySketch(sketch),
			replaceUrl: (url) => window.history.replaceState(null, '', url),
		});

		this.actions = {
			randomize: () => this.loadRandomGallerySketch(),
			makeRandomChange: () => this.makeRandomChange(),
			resetRunners: () => this.uiActions.resetRunners(),
			clearStorage: () => this.uiActions.clearStorage(),
			loadExample: (code: string) => this.uiActions.loadExample(code),
			revertToLastWorking: () => {
				this.textmodeEngine.getController()?.handleRevertToLastWorking();
			},
			reconnectTextmodeRunner: () => this.reconnectTextmodeRunner(),
			enableAudioInput: (deviceId?: string) => this.enableAudioInput(deviceId),
			disableAudioInput: () => this.disableAudioInput(),
			refreshAudioInputDevices: () => this.refreshAudioInputDevices(),
			selectAudioInputDevice: (deviceId: string) => this.selectAudioInputDevice(deviceId),
			unlockAndRun: () => this.shareManager.unlockAndRun(),
			unlockOnly: () => this.shareManager.unlockOnly(),
			discardShare: () => this.shareManager.discard(),
			openSharePrompt: () => this.shareManager.openPrompt(),
			keepShareLocked: () => this.shareManager.keepLocked(),
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

		this.creationLifecycleId = this.lifecycleId;
		this.attachAudioInputService();
		this.initPromise = this.initializeApp();
		return this.initPromise;
	}

	dispose(): void {
		this.lifecycleId += 1;
		this.clearRunnerReconnectTimer();
		this.shortcuts?.dispose();
		this.shortcuts = null;
		this.audioInputService.dispose();
		this.audioInputUnsubscribe?.();
		this.audioInputUnsubscribe = null;
		this.audioDeviceChangeUnsubscribe?.();
		this.audioDeviceChangeUnsubscribe = null;
		this.lastAudioLevelUiUpdateAt = 0;
		this.storeAdapter.audio.setInput({
			enabled: false,
			status: 'idle',
			permission: 'unknown',
			isRefreshingDevices: false,
			devices: [],
			selectedDeviceId: '',
			level: 0,
			error: null,
		});
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

	private attachAudioInputService(): void {
		if (!this.audioInputUnsubscribe) {
			this.audioInputUnsubscribe = this.audioInputService.subscribe((frame) => this.handleAudioInputFrame(frame));
		}

		if (!this.audioDeviceChangeUnsubscribe) {
			this.audioDeviceChangeUnsubscribe = this.audioInputService.subscribeToDeviceChanges(() => {
				void this.refreshAudioInputDevices();
			});
		}
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
		this.galleryManager.applyPendingGallerySketchIfPresent();
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
		const lifecycleId = this.lifecycleId;
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
				if (this.lifecycleId !== lifecycleId) return;
				this.storeAdapter.engine.setRunnerUnavailable(false);
				this.storeAdapter.engine.setRunnerReconnecting(false);
				this.storeAdapter.engine.setRunnerReady(true);
			},
			onRunnerDisconnected: () => {
				if (this.lifecycleId !== lifecycleId) return;
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
		if (!this.storeAdapter.share.getPayload()) {
			this.galleryManager.hydrateFromLocation(window.location);
			this.replaceUnknownEditorPath(window.location);
		} else {
			this.galleryManager.clear();
		}
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
		return (
			this.shareManager.getInitialCodeOverride() ??
			this.galleryManager.getInitialCodeOverride() ??
			this.storage.loadCode()
		);
	}

	private loadExample(code: string): boolean {
		if (!this.textmodeEngine.isInitialized()) return false;

		this.galleryManager.clear();
		this.replaceEditorUrl('/');
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
		this.galleryManager.clear();
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

	private async refreshAudioInputDevices(): Promise<void> {
		if (this.lifecycleId !== this.creationLifecycleId) return;
		if (!this.audioInputService.isSupported()) {
			this.storeAdapter.audio.setInput({
				enabled: false,
				status: 'unavailable',
				permission: 'unknown',
				isRefreshingDevices: false,
				devices: [],
				level: 0,
				error: {
					kind: 'unsupported',
					message: 'audio input is not supported in this browser',
					retryable: false,
				},
			});
			return;
		}

		const current = this.storeAdapter.audio.getInput();
		this.storeAdapter.audio.setInput({
			isRefreshingDevices: true,
			status: current.status === 'idle' ? 'checking' : current.status,
			error: current.status === 'active' ? null : current.error,
		});

		try {
			const [devices, permission] = await Promise.all([
				this.audioInputService.listDevices(),
				this.queryAudioInputPermission(),
			]);
			if (this.lifecycleId !== this.creationLifecycleId) return;
			const latest = this.storeAdapter.audio.getInput();
			const selectedDeviceStillExists =
				latest.selectedDeviceId === '' || devices.some((device) => device.deviceId === latest.selectedDeviceId);
			const selectedDeviceId = selectedDeviceStillExists ? latest.selectedDeviceId : '';
			let nextStatus = latest.status;
			if (latest.status !== 'active') {
				if (permission === 'denied') {
					nextStatus = 'permission-denied';
				} else if (devices.length === 0) {
					nextStatus = 'no-device';
				} else if (permission === 'prompt') {
					nextStatus = 'needs-permission';
				} else {
					nextStatus = 'idle';
				}
			}
			this.storeAdapter.audio.setInput({
				devices,
				selectedDeviceId,
				permission,
				status: nextStatus,
				isRefreshingDevices: false,
				error: null,
			});
		} catch (error) {
			this.storeAdapter.audio.setInput({
				enabled: false,
				status: 'error',
				isRefreshingDevices: false,
				error: this.toAudioErrorState(error),
			});
		}
	}

	private async enableAudioInput(deviceId?: string): Promise<void> {
		if (this.lifecycleId !== this.creationLifecycleId) return;
		if (!this.audioInputService.isSupported()) {
			this.storeAdapter.audio.setInput({
				enabled: false,
				status: 'unavailable',
				permission: 'unknown',
				isRefreshingDevices: false,
				level: 0,
				error: {
					kind: 'unsupported',
					message: 'audio input is not supported in this browser',
					retryable: false,
				},
			});
			return;
		}

		const current = this.storeAdapter.audio.getInput();
		const selectedDeviceId = deviceId ?? current.selectedDeviceId;
		this.storeAdapter.audio.setInput({
			enabled: false,
			status: 'requesting',
			selectedDeviceId,
			error: null,
		});

		try {
			const activeDeviceId = await this.audioInputService.start(selectedDeviceId || undefined);
			if (this.lifecycleId !== this.creationLifecycleId) return;
			const devices = await this.audioInputService.listDevices();
			if (this.lifecycleId !== this.creationLifecycleId) return;
			this.storeAdapter.audio.setInput({
				enabled: true,
				status: 'active',
				permission: 'granted',
				isRefreshingDevices: false,
				devices,
				selectedDeviceId: activeDeviceId,
				error: null,
			});
		} catch (error) {
			this.audioInputService.stop({ emitSilence: true });
			const errorState = this.toAudioErrorState(error);
			this.storeAdapter.audio.setInput({
				enabled: false,
				status: this.getAudioErrorStatus(errorState),
				permission: errorState.kind === 'permission-denied' ? 'denied' : current.permission,
				isRefreshingDevices: false,
				level: 0,
				error: errorState,
			});
		}
	}

	private disableAudioInput(): void {
		if (this.lifecycleId !== this.creationLifecycleId) return;
		this.audioInputService.stop({ emitSilence: true });
		this.lastAudioLevelUiUpdateAt = 0;
		this.storeAdapter.audio.setInput({
			enabled: false,
			status: 'idle',
			isRefreshingDevices: false,
			level: 0,
			error: null,
		});
	}

	private async selectAudioInputDevice(deviceId: string): Promise<void> {
		if (this.lifecycleId !== this.creationLifecycleId) return;
		this.storeAdapter.audio.setInput({ selectedDeviceId: deviceId });
		if (!this.storeAdapter.audio.getInput().enabled) return;
		await this.enableAudioInput(deviceId);
		if (this.lifecycleId !== this.creationLifecycleId) return;
	}

	private handleAudioInputFrame(frame: AudioInputFrame): void {
		if (this.lifecycleId !== this.creationLifecycleId) return;
		if (
			this.lastAudioLevelUiUpdateAt === 0 ||
			frame.timestamp - this.lastAudioLevelUiUpdateAt >= AUDIO_LEVEL_UI_INTERVAL_MS ||
			frame.level === 0
		) {
			this.lastAudioLevelUiUpdateAt = frame.timestamp;
			this.storeAdapter.audio.setInput({ level: frame.level });
		}
		this.textmodeEngine.sendAudioData({
			fft: frame.fft,
			waveform: frame.waveform,
			timestamp: frame.timestamp,
		});
	}

	private async queryAudioInputPermission(): Promise<AudioInputPermission> {
		const permissions = navigator.permissions;
		if (!permissions?.query) {
			return 'unknown';
		}

		try {
			const status = await permissions.query({ name: 'microphone' as PermissionName });
			if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
				return status.state;
			}
		} catch {
			// Some browsers expose Permissions but not the microphone descriptor.
		}

		return 'unknown';
	}

	private toAudioErrorState(error: unknown): AudioInputErrorState {
		const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : '';
		const message = error instanceof Error ? error.message : '';
		const normalized = `${name} ${message}`.toLowerCase();

		if (name === 'NotAllowedError' || name === 'SecurityError') {
			return {
				kind: 'permission-denied',
				message: 'microphone permission is blocked',
				retryable: true,
			};
		}

		if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
			return {
				kind: 'no-device',
				message: 'no audio input device found',
				retryable: true,
			};
		}

		if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
			return {
				kind: 'device-busy',
				message: 'audio input is unavailable or already in use',
				retryable: true,
			};
		}

		if (
			name === 'OverconstrainedError' ||
			name === 'ConstraintError' ||
			normalized.includes('invalid constraint') ||
			normalized.includes('constraint')
		) {
			return {
				kind: 'constraint',
				message: 'selected audio input is unavailable',
				retryable: true,
			};
		}

		if (normalized.includes('not supported')) {
			return {
				kind: 'unsupported',
				message: 'audio input is not supported in this browser',
				retryable: false,
			};
		}

		return {
			kind: 'unknown',
			message: 'could not start audio input',
			retryable: true,
		};
	}

	private getAudioErrorStatus(error: AudioInputErrorState): 'permission-denied' | 'no-device' | 'unavailable' | 'error' {
		if (error.kind === 'permission-denied') return 'permission-denied';
		if (error.kind === 'no-device') return 'no-device';
		if (error.kind === 'unsupported') return 'unavailable';
		return 'error';
	}

	private handleTextmodePaneReady(container: HTMLElement): void {
		this.textmodeContainer = container;
		this.maybeInitializeEngine();
	}

	private applyGallerySketch(sketch: GallerySketch): void {
		if (!this.textmodeEngine.isInitialized()) return;

		const code = sketch.textmodeCode;
		this.textmodeEngine.setCode(code, { silent: true });
		this.textmodeEngine.reconnectRuntime(code);
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
		this.galleryManager.clear();
		this.replaceEditorUrl('/');
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
				hardReset: () => this.textmodeEngine.getController()?.handleHardReset(),
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
			this.storeAdapter.gallery.setActiveSketch(null);
			this.storeAdapter.gallery.setSketchSummary(null);
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

	private async loadRandomGallerySketch(): Promise<boolean> {
		if (!this.textmodeEngine.isInitialized()) return false;
		return this.galleryManager.loadRandom();
	}

	private replaceUnknownEditorPath(location: Location): void {
		if (location.pathname === '/') return;
		if (this.storeAdapter.gallery.getActiveSketch()) return;
		this.replaceEditorUrl('/');
	}

	private replaceEditorUrl(url: string): void {
		window.history.replaceState(null, '', url);
	}
}
