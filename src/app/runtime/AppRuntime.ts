import { ShareManager, type ShareExportData } from '@/features/share';
import { GalleryManager, type GallerySketch } from '@/features/gallery-sketches';
import { ShortcutsManager, type IShortcutsManager } from '@/platform/input/ShortcutsManager';
import { CodeRandomizer } from './CodeRandomizer';
import { defaultTextmodeSketch } from '@/features/examples/content/default-sketches';
import { TextmodeEngine, type TextmodeEngineContext } from '@/textmode/TextmodeEngine';
import type { TextmodeEditor } from '@/textmode/editor/TextmodeEditor';
import { useAppStore } from '@/platform/state/appStore';
import { editorStorage, type IEditorStorage } from '@/platform/storage/EditorStorage';
import { AudioInputService, type AudioInputFrame } from '@/platform/audio/AudioInputService';

import type { AudioInputErrorState, AudioInputPermission } from '@/platform/state/slices/audioSlice';
import { MOBILE_BREAKPOINT, type AppSettings } from '@/types';
import type { SharePayload } from '@/features/share/model/sharePayload';
import type { AppRuntimeContextValue } from './AppRuntimeContext';

const AUDIO_LEVEL_UI_INTERVAL_MS = 1000 / 12;
const getAppState = useAppStore.getState;

/**
 * Main application composition root.
 * Orchestrates the textmode engine, share workflow, and UI.
 * Instantiated from within a React component (EditorApp).
 */
export class AppRuntime {
	private readonly storage: IEditorStorage;

	private readonly textmodeEngine: TextmodeEngine;
	private readonly shareManager: ShareManager;
	private readonly galleryManager: GalleryManager;
	private readonly audioInputService: AudioInputService;

	/** Stable action references for React context (never change after construction). */
	readonly actions: AppRuntimeContextValue['actions'];
	/** Stable layout callbacks for React context. */
	readonly layout: AppRuntimeContextValue['layout'];

	private textmodeEditor: TextmodeEditor | null = null;
	private textmodeContainer: HTMLElement | null = null;
	private shortcuts: IShortcutsManager | null = null;
	private storeUnsubscribers: Array<() => void> = [];
	private audioInputUnsubscribe: (() => void) | null = null;
	private audioDeviceChangeUnsubscribe: (() => void) | null = null;
	private initialized = false;
	private lifecycleId = 0;
	private runnerReconnectTimer: number | null = null;
	private lastAudioLevelUiUpdateAt = 0;

	constructor() {
		this.storage = editorStorage;

		// Register default code
		this.storage.setDefaultCode(defaultTextmodeSketch);

		// Create engine directly
		this.textmodeEngine = new TextmodeEngine();
		this.audioInputService = new AudioInputService();

		this.shareManager = new ShareManager({
			getShare: () => getAppState().share,
			setSharePayload: (payload) => getAppState().setSharePayload(payload),
			setShareConsented: (consented) => getAppState().setShareConsented(consented),
			setSharePromptOpen: (open) => getAppState().setSharePromptOpen(open),
			setEditorReadOnly: (readOnly) => this.setEditorReadOnly(readOnly),
			applyPayload: (payload) => this.applySharePayload(payload),
			focusEditor: () => this.focusEditor(),
			restoreLocalSketches: () => this.restoreLocalSketches(),
			runCode: () => this.textmodeEngine.getController()?.handleForceRun(),
			replaceUrl: (url) => window.history.replaceState(null, '', url),
		});

		this.galleryManager = new GalleryManager({
			getGallerySketch: () => getAppState().gallerySketch,
			getOriginalGallerySketch: () => getAppState().originalGallerySketch,
			setGallerySketch: (sketch) => getAppState().setGallerySketch(sketch),
			clearGallerySketches: () => getAppState().clearOriginalGallerySketch(),
			setSharePayload: (payload) => getAppState().setSharePayload(payload),
			setError: (error) => getAppState().setError(error),
			applyGallerySketch: (sketch) => this.applyGallerySketch(sketch),
			replaceUrl: (url) => window.history.replaceState(null, '', url),
		});

		this.actions = {
			randomize: () => this.loadRandomGallerySketch(),
			makeRandomChange: () => this.makeRandomChange(),
			resetRunners: () => this.reloadTextmodeSandbox(),
			clearStorage: () => this.clearStorage(),
			loadExample: (code: string) => this.loadExample(code),
			revertToLastWorking: () => this.textmodeEngine.getController()?.handleRevertToLastWorking(),
			reconnectTextmodeRunner: () => this.reloadTextmodeSandbox(),
			enableAudioInput: (deviceId?: string) => this.enableAudioInput(deviceId),
			disableAudioInput: () => this.disableAudioInput(),
			refreshAudioInputDevices: () => this.refreshAudioInputDevices(),
			selectAudioInputDevice: (deviceId: string) => this.selectAudioInputDevice(deviceId),
			unlockAndRun: () => this.shareManager.unlockAndRun(),
			unlockOnly: () => this.shareManager.unlockOnly(),
			discardShare: () => this.shareManager.discard(),
			openSharePrompt: () => this.shareManager.openPrompt(),
			keepShareLocked: () => this.shareManager.keepLocked(),
			copyShareExportUrl: (url: string) => this.copyShareExportUrl(url),
			getShareExportData: () => this.getShareExportData(),
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

		this.attachAudioInputService();
		this.initializeApp();
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
		getAppState().setAudioInput({
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

		this.textmodeEditor = null;
		this.textmodeContainer = null;
		if (this.textmodeEngine.isInitialized()) {
			this.textmodeEngine.dispose();
		}
		getAppState().setRunnerUnavailable(false);
		getAppState().setRunnerReconnecting(false);

		this.initialized = false;
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
		if (!this.initialized || this.textmodeEngine.isInitialized() || !this.textmodeContainer) {
			return;
		}

		this.bootstrapEngine(this.textmodeContainer);
	}

	private bootstrapEngine(container: HTMLElement): void {
		this.textmodeEngine.init(this.createEngineContext(container));
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
			getSettings: () => getAppState().settings,
			controllerState: {
				clearError: () => getAppState().clearError(),
				setError: (error) => getAppState().setError(error),
				getLastWorkingCode: () => getAppState().lastWorkingCode,
				setLastWorkingCode: (code) => getAppState().setLastWorkingCode(code),
			},
			isExecutionLocked: () => this.shareManager.lockExecutionIfNeeded(),
			onCodeChanged: (code) => this.galleryManager.syncActiveSketchWithCode(code),
			callbacks: {
				onSaveCode: (code: string) => this.storage.saveCode(code),
				onClearCode: () => this.storage.clearCode(),
			},
			getInitialCode: () => this.getInitialCode(),
			toggleUI: () => this.toggleUIVisibility(),
			changeFontSize: (delta) => this.changeFontSize(delta),
			onRunnerConnected: () => {
				if (this.lifecycleId !== lifecycleId) return;
				getAppState().setRunnerUnavailable(false);
				getAppState().setRunnerReconnecting(false);
			},
			onRunnerDisconnected: () => {
				if (this.lifecycleId !== lifecycleId) return;
				getAppState().setRunnerUnavailable(true);
				getAppState().setRunnerReconnecting(false);
			},
		};
	}

	private applyEditorSettings(): void {
		const editor = this.textmodeEditor;
		if (!editor) return;

		const settings = getAppState().settings;
		editor.updateOptions({
			fontSize: settings.fontSize,
			lineNumbers: settings.lineNumbers ? 'on' : 'off',
			lineNumbersMinChars: settings.lineNumbers ? 2 : 0,
			lineDecorationsWidth: settings.lineNumbers ? 16 : 0,
		});
		editor.updateEnvironment({ backdrop: settings.editorBackdrop });
	}

	private initializeApp(): void {
		if (this.initialized) return;

		const loadedSettings = this.storage.loadSettings();
		getAppState().setSettings(loadedSettings);
		this.shareManager.hydrateFromLocation(window.location);
		if (!getAppState().share.payload) {
			this.galleryManager.hydrateFromLocation(window.location);
			this.replaceUnknownEditorPath(window.location);
		} else {
			this.galleryManager.clear();
		}

		this.initialized = true;
		this.maybeInitializeEngine();
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
		this.textmodeEngine.getController()?.replaceAndRun(code);

		return true;
	}

	private getShareExportData(): ShareExportData {
		return {
			createdAt: Date.now(),
			textmodeCode: this.textmodeEngine.getCode(),
		};
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

	private clearStorage(): void {
		if (!this.textmodeEngine.isInitialized()) return;
		this.galleryManager.clear();
		this.replaceEditorUrl('/');
		this.textmodeEngine.getController()?.replaceAndRun(defaultTextmodeSketch, 'reset');
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

	private restoreLocalSketches(): void {
		if (!this.textmodeEngine.isInitialized()) return;
		this.galleryManager.clear();
		const code = this.storage.loadCode();
		this.textmodeEngine.setCode(code, { silent: true });
	}

	private setEditorReadOnly(readOnly: boolean): void {
		this.textmodeEditor?.updateOptions({ readOnly });
	}

	private focusEditor(): void {
		this.textmodeEditor?.focus();
	}

	private async refreshAudioInputDevices(): Promise<void> {
		const lifecycleId = this.lifecycleId;
		if (!this.audioInputService.isSupported()) {
			getAppState().setAudioInput({
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

		const current = getAppState().audioInput;
		getAppState().setAudioInput({
			isRefreshingDevices: true,
			status: current.status === 'idle' ? 'checking' : current.status,
			error: current.status === 'active' ? null : current.error,
		});

		try {
			const [devices, permission] = await Promise.all([
				this.audioInputService.listDevices(),
				this.queryAudioInputPermission(),
			]);
			if (lifecycleId !== this.lifecycleId) return;
			const latest = getAppState().audioInput;
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
			getAppState().setAudioInput({
				devices,
				selectedDeviceId,
				permission,
				status: nextStatus,
				isRefreshingDevices: false,
				error: null,
			});
		} catch (error) {
			if (lifecycleId !== this.lifecycleId) return;
			getAppState().setAudioInput({
				enabled: false,
				status: 'error',
				isRefreshingDevices: false,
				error: this.toAudioErrorState(error),
			});
		}
	}

	private async enableAudioInput(deviceId?: string): Promise<void> {
		const lifecycleId = this.lifecycleId;
		if (!this.audioInputService.isSupported()) {
			getAppState().setAudioInput({
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

		const current = getAppState().audioInput;
		const selectedDeviceId = deviceId ?? current.selectedDeviceId;
		getAppState().setAudioInput({
			enabled: false,
			status: 'requesting',
			selectedDeviceId,
			error: null,
		});

		try {
			const activeDeviceId = await this.audioInputService.start(selectedDeviceId || undefined);
			if (lifecycleId !== this.lifecycleId) return;
			const devices = await this.audioInputService.listDevices();
			if (lifecycleId !== this.lifecycleId) return;
			getAppState().setAudioInput({
				enabled: true,
				status: 'active',
				permission: 'granted',
				isRefreshingDevices: false,
				devices,
				selectedDeviceId: activeDeviceId,
				error: null,
			});
		} catch (error) {
			if (lifecycleId !== this.lifecycleId) return;
			this.audioInputService.stop({ emitSilence: true });
			const errorState = this.toAudioErrorState(error);
			getAppState().setAudioInput({
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
		this.audioInputService.stop({ emitSilence: true });
		this.lastAudioLevelUiUpdateAt = 0;
		getAppState().setAudioInput({
			enabled: false,
			status: 'idle',
			isRefreshingDevices: false,
			level: 0,
			error: null,
		});
	}

	private async selectAudioInputDevice(deviceId: string): Promise<void> {
		getAppState().setAudioInput({ selectedDeviceId: deviceId });
		if (!getAppState().audioInput.enabled) return;
		await this.enableAudioInput(deviceId);
	}

	private handleAudioInputFrame(frame: AudioInputFrame): void {
		if (
			this.lastAudioLevelUiUpdateAt === 0 ||
			frame.timestamp - this.lastAudioLevelUiUpdateAt >= AUDIO_LEVEL_UI_INTERVAL_MS ||
			frame.level === 0
		) {
			this.lastAudioLevelUiUpdateAt = frame.timestamp;
			getAppState().setAudioInput({ level: frame.level });
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

	private getAudioErrorStatus(
		error: AudioInputErrorState
	): 'permission-denied' | 'no-device' | 'unavailable' | 'error' {
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
		this.textmodeEngine.getController()?.replaceAndRun(code, 'reset-runtime');
	}

	private reloadTextmodeSandbox(): void {
		if (!this.textmodeEngine.isInitialized()) return;

		this.textmodeEngine.reloadSandbox();
		this.markRunnerReconnecting();
	}

	private markRunnerReconnecting(): void {
		getAppState().setRunnerReconnecting(true);
		this.clearRunnerReconnectTimer();
		this.runnerReconnectTimer = window.setTimeout(() => {
			this.runnerReconnectTimer = null;
			getAppState().setRunnerReconnecting(false);
		}, 10000);
	}

	private clearRunnerReconnectTimer(): void {
		if (this.runnerReconnectTimer === null) return;
		window.clearTimeout(this.runnerReconnectTimer);
		this.runnerReconnectTimer = null;
	}

	// ----- End engine lifecycle -----

	private createShortcutsManager(): IShortcutsManager {
		return new ShortcutsManager({
			actions: {
				changeFontSize: (delta) => this.changeFontSize(delta),
				toggleAutoExecute: () => {
					const s = this.settings;
					getAppState().updateSettings({ autoExecute: !s.autoExecute });
				},
				toggleEditorBackdrop: () => {
					const s = this.settings;
					getAppState().updateSettings({ editorBackdrop: !s.editorBackdrop });
				},
				hardReset: () => this.textmodeEngine.getController()?.handleHardReset(),
				toggleUIVisibility: () => this.toggleUIVisibility(),
				runCode: () => this.textmodeEngine.getController()?.handleForceRun(),
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
			getAppState().setGallerySketch(null);
			this.textmodeEngine.getController()?.replaceAndRun(newCode);
			// On mobile, avoid forcing editor focus to prevent opening the software keyboard.
			if (window.innerWidth > MOBILE_BREAKPOINT) {
				this.focusEditor();
			}
		}
	}

	private loadRandomGallerySketch(): boolean {
		if (!this.textmodeEngine.isInitialized()) return false;
		return this.galleryManager.loadRandom();
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
