import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import { PaneCoordinator } from '@/app/orchestration/PaneCoordinator';
import { EditorManager } from '@/managers/EditorManager';
import { audioService, type IAudioSource } from '@/services/AudioService';
import type { IStorageService } from '@/services/StorageService';
import { StrudelEngine } from '@/engines/strudel/StrudelEngine';
import { StrudelAudioSource } from '@/engines/strudel/audio/StrudelAudioSource';
import { TextmodeEngine } from '@/engines/textmode/TextmodeEngine';
import { createPaneStoreAdapter } from '@/platform/state/adapters/paneStoreAdapter';
import { useAppStore } from '@/platform/state/appStore';
import type { AppSettings, StrudelTransportState } from '@/types/app.types';
import type { EngineId } from '@/types/engine.types';
import type { SharePayload } from '@/types/share.types';

interface EngineLifecycleDependencies {
	paneCoordinator: PaneCoordinator;
	editorManager: EditorManager;
	storage: IStorageService;
	getSettings: () => AppSettings;
	render: () => void;
	toggleUI: () => void;
	changeFontSize: (delta: number) => void;
	createAudioSource: () => IAudioSource;
}

type RuntimeEngine = TextmodeEngine | StrudelEngine;

/**
 * Owns runtime engine lifecycle and engine-level workflows.
 * Keeps AppRuntime focused on orchestration only.
 */
export class EngineLifecycle {
	private readonly deps: EngineLifecycleDependencies;
	private readonly textmodeEngine = new TextmodeEngine();
	private strudelEngine: StrudelEngine | null = null;
	private enableStrudelPromise: Promise<void> | null = null;
	private audioUnsubscribe: (() => void) | null = null;

	constructor(deps: Omit<EngineLifecycleDependencies, 'createAudioSource'> & { createAudioSource?: () => IAudioSource }) {
		this.deps = {
			...deps,
			createAudioSource: deps.createAudioSource ?? (() => new StrudelAudioSource()),
		};
	}

	async initTextmodeEngine(): Promise<void> {
		useAppStore.getState().initEngineState('textmode');
		const container = await this.deps.paneCoordinator.waitForPane('textmode');

		await this.textmodeEngine.init({
			editorContainer: container,
			visualContainer: document.body,
			getSettings: this.deps.getSettings,
			callbacks: {
				onRenderOverlay: this.deps.render,
				onSaveCode: (code: string) => this.deps.storage.saveEngineCode('textmode', code),
			},
			getInitialCode: () => this.deps.storage.loadEngineCode('textmode'),
			toggleUI: this.deps.toggleUI,
			changeFontSize: this.deps.changeFontSize,
		});

		const editor = this.textmodeEngine.getEditor();
		if (editor) {
			this.deps.editorManager.registerEditor('textmode', editor);
		}
	}

	async enableStrudel(): Promise<boolean> {
		if (this.strudelEngine) return false;
		if (this.enableStrudelPromise) {
			await this.enableStrudelPromise;
			return false;
		}

		this.enableStrudelPromise = this.enableStrudelInternal();
		try {
			await this.enableStrudelPromise;
		} finally {
			this.enableStrudelPromise = null;
		}
		return true;
	}

	disableStrudel(): boolean {
		if (!this.strudelEngine) return false;
		this.disableStrudelInternal();
		return true;
	}

	async setStrudelEnabled(enabled: boolean): Promise<boolean> {
		this.deps.paneCoordinator.sync(this.deps.getSettings(), createPaneStoreAdapter());
		this.deps.render();

		if (enabled) {
			await this.deps.paneCoordinator.waitForPanes(this.deps.paneCoordinator.getPaneIds());
			const didEnable = await this.enableStrudel();
			return didEnable;
		}

		this.disableStrudel();
		return false;
	}

	setStrudelTransport(transport: StrudelTransportState): void {
		if (!this.strudelEngine) return;
		if (transport === 'playing') {
			this.strudelEngine.getController()?.handleForceRun();
			return;
		}
		this.pauseStrudelPlayback();
	}

	applyEditorSettings(): void {
		this.deps.editorManager.applySettings(this.deps.getSettings());
	}

	hushStrudel(): void {
		this.pauseStrudelPlayback();
	}

	getCode(engineId: EngineId): string {
		const engine = this.getEngine(engineId);
		return engine?.getCode() ?? '';
	}

	getEngine(engineId: EngineId): RuntimeEngine | null {
		if (engineId === 'textmode') return this.textmodeEngine;
		if (engineId === 'strudel') return this.strudelEngine;
		return null;
	}

	runEngine(engineId: EngineId): void {
		if (engineId === 'strudel' && !this.shouldRunStrudel()) {
			this.pauseStrudelPlayback();
			return;
		}
		this.getEngine(engineId)?.getController()?.handleForceRun();
	}

	loadExample(engineId: EngineId, code: string): boolean {
		const engine = this.getEngine(engineId);
		if (!engine) return false;

		if (engineId === 'strudel' && this.strudelEngine) {
			this.strudelEngine.setCode(code, { silent: true });
			this.deps.storage.saveEngineCode(engineId, code);
			if (this.shouldRunStrudel()) {
				this.strudelEngine.getController()?.handleForceRun();
			} else {
				this.pauseStrudelPlayback();
			}
			return true;
		}

		engine.setCode(code);
		this.deps.storage.saveEngineCode(engineId, code);
		engine.getController()?.handleForceRun();
		return true;
	}

	applySharePayload(payload: SharePayload): void {
		if (payload.engines.textmode !== undefined) {
			this.textmodeEngine.setCode(payload.engines.textmode, { silent: true });
		}

		if (payload.engines.strudel !== undefined && this.strudelEngine) {
			this.strudelEngine.setCode(payload.engines.strudel, { silent: true });
		}
	}

	restoreLocalSketches(): void {
		const textmodeCode = this.deps.storage.loadEngineCode('textmode');
		this.textmodeEngine.setCode(textmodeCode, { silent: true });

		if (this.strudelEngine) {
			const strudelCode = this.deps.storage.loadEngineCode('strudel');
			this.strudelEngine.setCode(strudelCode, { silent: true });
		}
	}

	runRestoredSketches(): void {
		this.textmodeEngine.getController()?.handleForceRun();
	}

	runSharedSketch(payload: SharePayload): void {
		if (payload.engines.textmode !== undefined) {
			this.textmodeEngine.getController()?.handleForceRun();
		}

		if (payload.engines.strudel !== undefined && this.strudelEngine) {
			if (this.shouldRunStrudel()) {
				this.strudelEngine.getController()?.handleForceRun();
			} else {
				this.pauseStrudelPlayback();
			}
		}
	}

	applyApprovedSketch(sketch: ApprovedSketch): void {
		this.textmodeEngine.setCode(sketch.textmodeCode, { silent: true });
		this.textmodeEngine.getRuntime()?.forceRun(sketch.textmodeCode);
		this.applyApprovedSketchToStrudel(sketch);
	}

	applyApprovedSketchToStrudel(sketch: ApprovedSketch): void {
		if (!this.strudelEngine) return;
		if (sketch.strudelCode) {
			this.strudelEngine.setCode(sketch.strudelCode, { silent: true });
			if (this.shouldRunStrudel()) {
				this.strudelEngine.getController()?.handleForceRun();
			} else {
				this.pauseStrudelPlayback();
			}
			return;
		}
		this.pauseStrudelPlayback();
	}

	resetAll(): void {
		useAppStore.getState().setEngineLastWorkingCode('textmode', null);
		useAppStore.getState().clearOriginalApprovedSketch();
		this.textmodeEngine.setCode(this.textmodeEngine.getDefaultCode());

		useAppStore.getState().setEngineLastWorkingCode('strudel', null);
		if (this.strudelEngine) {
			this.strudelEngine.setCode(this.strudelEngine.getDefaultCode(), { silent: true });
			if (this.shouldRunStrudel()) {
				this.strudelEngine.getController()?.handleForceRun();
			} else {
				this.pauseStrudelPlayback();
			}
		}
	}

	dispose(): void {
		this.stopAudioReactivity();
		this.strudelEngine?.dispose();
		this.strudelEngine = null;
		this.textmodeEngine.dispose();
	}

	private async enableStrudelInternal(): Promise<void> {
		if (this.strudelEngine) return;

		useAppStore.getState().initEngineState('strudel');
		const container = await this.deps.paneCoordinator.waitForPane('strudel');

		this.strudelEngine = new StrudelEngine();
		await this.strudelEngine.init({
			editorContainer: container,
			getSettings: this.deps.getSettings,
			callbacks: {
				onRenderOverlay: this.deps.render,
				onSaveCode: (code: string) => this.deps.storage.saveEngineCode('strudel', code),
			},
			getInitialCode: () => this.deps.storage.loadEngineCode('strudel'),
			toggleUI: this.deps.toggleUI,
			changeFontSize: this.deps.changeFontSize,
		});

		const editor = this.strudelEngine.getEditor();
		if (editor) {
			this.deps.editorManager.registerEditor('strudel', editor);
		}

		this.applyEditorSettings();
		this.startAudioReactivity();
	}

	private disableStrudelInternal(): void {
		if (!this.strudelEngine) return;

		this.pauseStrudelPlayback();
		this.stopAudioReactivity();

		this.deps.editorManager.unregisterEditor('strudel');
		this.strudelEngine.dispose();
		this.strudelEngine = null;
		this.deps.paneCoordinator.removePane('strudel');

		const store = useAppStore.getState();
		store.setEngineInitialized('strudel', false);
		store.setEngineCustomState('strudel', 'state', {
			isPlaying: false,
			isInitialized: false,
		});
	}

	private shouldRunStrudel(): boolean {
		return this.deps.getSettings().strudelTransport === 'playing';
	}

	private pauseStrudelPlayback(): void {
		const controller = this.strudelEngine?.getController();
		if (controller) {
			controller.handleTransportPause();
			return;
		}
		this.strudelEngine?.hush();
	}

	private startAudioReactivity(): void {
		if (this.audioUnsubscribe) return;
		audioService.setSource(this.deps.createAudioSource());
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
}
