import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import { PaneCoordinator } from '@/features/editor-layout/model/PaneCoordinator';
import { EditorManager } from '@/platform/input/EditorManager';
import { audioService, type IAudioSource } from '@/platform/audio/AudioService';
import type { IStorageService } from '@/platform/storage/StorageService';
import { registry } from '@/engines/registry';
import type { StrudelEngine } from '@/engines/strudel/StrudelEngine';
import { StrudelAudioSource } from '@/engines/strudel/audio/StrudelAudioSource';
import type { TextmodeEngine } from '@/engines/textmode/TextmodeEngine';
import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { PaneStoreAdapter } from '@/platform/state/adapters/paneStoreAdapter';

import type { StrudelTransportState } from '@/core/app.types';
import type { EngineId } from '@/core/engine.types';
import type { SharePayload } from '@/features/share/share.types';

interface EngineLifecycleDependencies {
	paneCoordinator: PaneCoordinator;
	paneStore: PaneStoreAdapter;
	editorManager: EditorManager;
	storage: IStorageService;
	store: AppStoreAdapter;
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
	private enableStrudelPromise: Promise<void> | null = null;
	private audioUnsubscribe: (() => void) | null = null;

	constructor(deps: Omit<EngineLifecycleDependencies, 'createAudioSource'> & { createAudioSource?: () => IAudioSource }) {
		this.deps = {
			...deps,
			createAudioSource: deps.createAudioSource ?? (() => new StrudelAudioSource()),
		};
	}

	private get textmodeEngine(): TextmodeEngine {
		const engine = registry.get('textmode');
		if (!engine) throw new Error('Textmode engine not registered');
		return engine as TextmodeEngine;
	}

	private get strudelEngine(): StrudelEngine | null {
		const engine = registry.get('strudel');
		return (engine as StrudelEngine) ?? null;
	}

	async initTextmodeEngine(): Promise<void> {
		this.deps.store.engine.initEngineState('textmode');
		this.deps.store.engine.setCustomState('textmode', 'runnerUnavailable', false);
		this.deps.store.engine.setCustomState('textmode', 'runnerReconnecting', false);
		const container = await this.deps.paneCoordinator.waitForPane('textmode');

		await this.textmodeEngine.init({
			editorContainer: container,
			visualContainer: document.body,
			getSettings: this.deps.store.settings.getSettings,
			callbacks: {
				onRenderOverlay: this.deps.render,
				onSaveCode: (code: string) => this.deps.storage.saveEngineCode('textmode', code),
			},
			getInitialCode: () => this.deps.storage.loadEngineCode('textmode'),
			toggleUI: this.deps.toggleUI,
			changeFontSize: this.deps.changeFontSize,
			onRunnerConnected: () => {
				this.deps.store.engine.setCustomState('textmode', 'runnerUnavailable', false);
				this.deps.store.engine.setCustomState('textmode', 'runnerReconnecting', false);
			},
			onRunnerDisconnected: () => {
				this.deps.store.engine.setCustomState('textmode', 'runnerUnavailable', true);
				this.deps.store.engine.setCustomState('textmode', 'runnerReconnecting', false);
			},
		});

		const editor = this.textmodeEngine.getEditor();
		if (editor) {
			this.deps.editorManager.registerEditor('textmode', editor);
		}
	}

	async enableStrudel(): Promise<boolean> {
		if (this.strudelEngine?.isInitialized()) return false;
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
		if (!this.strudelEngine?.isInitialized()) return false;
		this.disableStrudelInternal();
		return true;
	}

	async setStrudelEnabled(enabled: boolean): Promise<boolean> {
		this.deps.paneCoordinator.sync(this.deps.store.settings.getSettings(), this.deps.paneStore);
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
		if (!this.strudelEngine?.isInitialized()) return;
		if (transport === 'playing') {
			this.strudelEngine.getController()?.handleForceRun();
			return;
		}
		this.pauseStrudelPlayback();
	}

	applyEditorSettings(): void {
		this.deps.editorManager.applySettings(this.deps.store.settings.getSettings());
	}

	hushStrudel(): void {
		this.pauseStrudelPlayback();
	}

	getCode(engineId: EngineId): string {
		const engine = registry.get(engineId);
		return engine?.getCode() ?? '';
	}

	getEngine(engineId: EngineId): RuntimeEngine | null {
		const engine = registry.get(engineId);
		// Cast as RuntimeEngine which is TextmodeEngine | StrudelEngine
		return (engine as RuntimeEngine) ?? null;
	}

	runEngine(engineId: EngineId): void {
		if (engineId === 'strudel' && !this.shouldRunStrudel()) {
			this.pauseStrudelPlayback();
			return;
		}
		this.getEngine(engineId)?.getController()?.handleForceRun();
	}

	reconnectTextmodeRunner(): void {
		this.textmodeEngine.reconnectRuntime();
	}

	loadExample(engineId: EngineId, code: string): boolean {
		const engine = this.getEngine(engineId);
		if (!engine) return false;

		if (engineId === 'strudel') {
			const strudel = engine as StrudelEngine;
			strudel.setCode(code, { silent: true });
			this.deps.storage.saveEngineCode(engineId, code);
			if (this.shouldRunStrudel()) {
				strudel.getController()?.handleForceRun();
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

		if (payload.engines.strudel !== undefined && this.strudelEngine?.isInitialized()) {
			this.strudelEngine.setCode(payload.engines.strudel, { silent: true });
		}
	}

	restoreLocalSketches(): void {
		const textmodeCode = this.deps.storage.loadEngineCode('textmode');
		this.textmodeEngine.setCode(textmodeCode, { silent: true });

		if (this.strudelEngine?.isInitialized()) {
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

		if (payload.engines.strudel !== undefined && this.strudelEngine?.isInitialized()) {
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
		if (!this.strudelEngine?.isInitialized()) return;
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
		this.deps.store.engine.setLastWorkingCode('textmode', null);
		this.deps.store.share.clearOriginalApprovedSketch();
		// Use generic reset if possible, or explicit defaults
		// Since getDefaultCode was removed from IEngine/Engine classes (moved to StorageService defaults),
		// we should load from StorageService (assuming clearCode reset them to defaults?)
		// StorageService.clearCode() removes keys. loadEngineCode then returns default.
		// So we should call deps.storage.clearCode() then reload.

		// Wait, resetAll in current logic:
		// this.textmodeEngine.setCode(this.textmodeEngine.getDefaultCode());
		// Storage code is NOT cleared in the original code? 
		// Original: resetAll() -> setCode(default). It doesn't explicitly save to storage here, 
		// but controller change handler will save it?
		// TextmodeEditor options: onChange: handlesCodeChange -> onSaveCode -> storage.saveEngineCode.
		// Yes.

		// So we need to get default code.
		// We can't ask engine for it anymore.
		// But we registered it in StorageService.
		// Maybe StorageService should expose `getDefaultCode(engineId)`?
		// Or we just rely on `storage.clearEngineCode(id)` then `storage.loadEngineCode(id)`.

		this.deps.storage.clearEngineCode('textmode');
		this.textmodeEngine.setCode(this.deps.storage.loadEngineCode('textmode'));

		this.deps.store.engine.setLastWorkingCode('strudel', null);
		if (this.strudelEngine?.isInitialized()) {
			this.deps.storage.clearEngineCode('strudel');
			this.strudelEngine.setCode(this.deps.storage.loadEngineCode('strudel'), { silent: true });
			if (this.shouldRunStrudel()) {
				this.strudelEngine.getController()?.handleForceRun();
			} else {
				this.pauseStrudelPlayback();
			}
		}
	}

	dispose(): void {
		this.stopAudioReactivity();
		// We don't dispose the engine instances here if they are singletons from registry?
		// Original code: this.strudelEngine?.dispose(); this.textmodeEngine.dispose();
		// If AppRuntime owns them, AppRuntime should dispose them?
		// EngineLifecycle "owns runtime engine lifecycle".
		// Calling dispose on the engine instance is correct if the app is shutting down.
		if (this.strudelEngine?.isInitialized()) {
			this.strudelEngine.dispose();
		}
		this.textmodeEngine.dispose();
	}

	private async enableStrudelInternal(): Promise<void> {
		const engine = this.strudelEngine;
		if (!engine) return;
		if (engine.isInitialized()) return;

		this.deps.store.engine.initEngineState('strudel');
		const container = await this.deps.paneCoordinator.waitForPane('strudel');

		// Reuse existing instance from registry
		await engine.init({
			editorContainer: container,
			getSettings: this.deps.store.settings.getSettings,
			callbacks: {
				onRenderOverlay: this.deps.render,
				onSaveCode: (code: string) => this.deps.storage.saveEngineCode('strudel', code),
			},
			getInitialCode: () => this.deps.storage.loadEngineCode('strudel'),
			toggleUI: this.deps.toggleUI,
			changeFontSize: this.deps.changeFontSize,
		});

		const editor = engine.getEditor();
		if (editor) {
			this.deps.editorManager.registerEditor('strudel', editor);
		}

		this.applyEditorSettings();
		this.startAudioReactivity();
	}

	private disableStrudelInternal(): void {
		const engine = this.strudelEngine;
		if (!engine) return;

		this.pauseStrudelPlayback();
		this.stopAudioReactivity();

		this.deps.editorManager.unregisterEditor('strudel');
		engine.dispose();
		this.deps.paneCoordinator.removePane('strudel');

		const store = this.deps.store.engine;
		store.setInitialized('strudel', false);
		store.setCustomState('strudel', 'state', {
			isPlaying: false,
			isInitialized: false,
		});
	}

	private shouldRunStrudel(): boolean {
		return this.deps.store.settings.getSettings().strudelTransport === 'playing';
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
