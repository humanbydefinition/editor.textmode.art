import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import type { SharePayload } from '@synth.textmode.art/contracts/share';
import type { IController } from '@/core/BaseController';
import type { EngineContext, EngineId, IEngine } from '@/core/engine.types';
import type { StrudelTransportState } from '@/core/app.types';
import { registry } from '@/engines/registry';
import { PaneCoordinator } from '@/features/editor-layout';
import { audioService, type AudioData, type IAudioSource } from '@/platform/audio/AudioService';
import { EditorManager } from '@/platform/input/EditorManager';
import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { PaneStoreAdapter } from '@/platform/state/adapters/paneStoreAdapter';
import type { IStorageService } from '@/platform/storage/StorageService';
import { StrudelAudioSource } from '@/engines/strudel/audio/StrudelAudioSource';

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

interface ReconnectableEngine extends IEngine {
	reconnectRuntime: () => void;
}

interface AudioInputEngine extends IEngine {
	sendAudioData: (data: AudioData) => void;
}

interface RuntimeForceRunEngine extends IEngine {
	getRuntime: () => { forceRun: (code: string) => void } | null;
}

interface TransportPauseController extends IController {
	handleTransportPause: () => void;
}

interface HushableEngine extends IEngine {
	hush: () => void;
}

/**
 * Owns runtime engine lifecycle and engine-level workflows.
 * Keeps AppRuntime focused on orchestration only.
 */
export class EngineLifecycle {
	private readonly deps: EngineLifecycleDependencies;
	private readonly enableEnginePromises = new Map<EngineId, Promise<void>>();
	private audioUnsubscribe: (() => void) | null = null;

	constructor(deps: Omit<EngineLifecycleDependencies, 'createAudioSource'> & { createAudioSource?: () => IAudioSource }) {
		this.deps = {
			...deps,
			createAudioSource: deps.createAudioSource ?? (() => new StrudelAudioSource()),
		};
	}

	async initEagerEngines(): Promise<void> {
		for (const engine of this.getRegisteredEngines().filter((candidate) => candidate.capabilities.bootStrategy === 'eager')) {
			await this.initEngine(engine);
		}
	}

	/**
	 * Backwards-compatible alias for older call sites.
	 */
	async initTextmodeEngine(): Promise<void> {
		await this.initEagerEngines();
	}

	async enableStrudel(): Promise<boolean> {
		return this.enableEngine('strudel');
	}

	disableStrudel(): boolean {
		return this.disableEngineById('strudel');
	}

	async setStrudelEnabled(enabled: boolean): Promise<boolean> {
		return this.setEngineEnabled('strudel', enabled);
	}

	setStrudelTransport(transport: StrudelTransportState): void {
		const transportEngines = this.getTransportEngines().filter((engine) => engine.isInitialized());
		if (transportEngines.length === 0) return;

		if (transport === 'playing') {
			for (const engine of transportEngines) {
				engine.getController()?.handleForceRun();
			}
			return;
		}

		this.pauseTransportEngines(transportEngines);
	}

	applyEditorSettings(): void {
		this.deps.editorManager.applySettings(this.deps.store.settings.getSettings());
	}

	hushStrudel(): void {
		this.pauseTransportEngines();
	}

	getCode(engineId: EngineId): string {
		return this.getEngine(engineId)?.getCode() ?? '';
	}

	getEngine(engineId: EngineId): IEngine | null {
		return registry.get(engineId) ?? null;
	}

	runEngine(engineId: EngineId): void {
		const engine = this.getEngine(engineId);
		if (!engine) return;

		if (!this.shouldRunEngine(engine)) {
			if (engine.capabilities.supportsTransportControl) {
				this.pauseTransportEngines([engine]);
			}
			return;
		}

		engine.getController()?.handleForceRun();
	}

	reconnectTextmodeRunner(): void {
		this.reconnectEngine('textmode');
	}

	loadExample(engineId: EngineId, code: string): boolean {
		const engine = this.getEngine(engineId);
		if (!engine) return false;

		const setOptions = engine.capabilities.requiresTransportGate ? { silent: true } : undefined;
		engine.setCode(code, setOptions);
		this.deps.storage.saveEngineCode(engineId, code);

		if (this.shouldRunEngine(engine)) {
			engine.getController()?.handleForceRun();
		} else if (engine.capabilities.supportsTransportControl) {
			this.pauseTransportEngines([engine]);
		}

		return true;
	}

	applySharePayload(payload: SharePayload): void {
		for (const [engineId, code] of Object.entries(payload.engines) as Array<[EngineId, string | undefined]>) {
			if (typeof code !== 'string') continue;
			const engine = this.getEngine(engineId);
			if (!engine) continue;
			if (!engine.isInitialized() && engine.capabilities.bootStrategy === 'toggleable') continue;
			engine.setCode(code, { silent: true });
		}
	}

	restoreLocalSketches(): void {
		for (const engine of this.getRegisteredEngines()) {
			if (!engine.isInitialized()) continue;
			const code = this.deps.storage.loadEngineCode(engine.id);
			engine.setCode(code, { silent: true });
		}
	}

	runRestoredSketches(): void {
		for (const engine of this.getRegisteredEngines().filter((candidate) => candidate.capabilities.bootStrategy === 'eager')) {
			engine.getController()?.handleForceRun();
		}
	}

	runSharedSketch(payload: SharePayload): void {
		for (const [engineId, code] of Object.entries(payload.engines) as Array<[EngineId, string | undefined]>) {
			if (typeof code !== 'string') continue;
			this.runEngine(engineId);
		}
	}

	applyApprovedSketch(sketch: ApprovedSketch): void {
		this.applyApprovedSketchToEngine('textmode', sketch);
		this.applyApprovedSketchToEngine('strudel', sketch);
	}

	applyApprovedSketchToStrudel(sketch: ApprovedSketch): void {
		this.applyApprovedSketchToEngine('strudel', sketch);
	}

	resetAll(): void {
		this.deps.store.share.clearOriginalApprovedSketch();

		for (const engine of this.getRegisteredEngines()) {
			this.deps.store.engine.setLastWorkingCode(engine.id, null);
			this.deps.storage.clearEngineCode(engine.id);

			if (!engine.isInitialized()) continue;

			const defaultCode = this.deps.storage.loadEngineCode(engine.id);
			if (engine.capabilities.bootStrategy === 'eager') {
				engine.setCode(defaultCode);
				continue;
			}

			engine.setCode(defaultCode, { silent: true });
			if (this.shouldRunEngine(engine)) {
				engine.getController()?.handleForceRun();
			} else if (engine.capabilities.supportsTransportControl) {
				this.pauseTransportEngines([engine]);
			}
		}
	}

	dispose(): void {
		this.stopAudioReactivity();
		this.enableEnginePromises.clear();

		for (const engine of this.getRegisteredEngines()) {
			this.deps.editorManager.unregisterEditor(engine.id);

			if (engine.isInitialized()) {
				engine.dispose();
			}

			this.deps.store.engine.setInitialized(engine.id, false);
			this.applyCustomState(engine.id, engine.capabilities.customStateOnDisable);

			if (engine.capabilities.bootStrategy === 'toggleable') {
				this.deps.paneCoordinator.removePane(engine.id);
			}
		}
	}

	private getRegisteredEngines(): IEngine[] {
		return registry.getAll();
	}

	private async setEngineEnabled(engineId: EngineId, enabled: boolean): Promise<boolean> {
		this.deps.paneCoordinator.sync(this.deps.store.settings.getSettings(), this.deps.paneStore);
		this.deps.render();

		if (enabled) {
			await this.deps.paneCoordinator.waitForPanes(this.deps.paneCoordinator.getPaneIds());
			return this.enableEngine(engineId);
		}

		this.disableEngineById(engineId);
		return false;
	}

	private async enableEngine(engineId: EngineId): Promise<boolean> {
		const engine = this.getEngine(engineId);
		if (!engine) return false;
		if (engine.isInitialized()) return false;

		const pendingInit = this.enableEnginePromises.get(engineId);
		if (pendingInit) {
			await pendingInit;
			return false;
		}

		const initPromise = this.initEngine(engine);
		this.enableEnginePromises.set(engineId, initPromise);
		try {
			await initPromise;
		} finally {
			this.enableEnginePromises.delete(engineId);
		}
		return true;
	}

	private disableEngineById(engineId: EngineId): boolean {
		const engine = this.getEngine(engineId);
		if (!engine || !engine.isInitialized()) return false;

		if (engine.capabilities.supportsTransportControl) {
			this.pauseTransportEngines([engine]);
		}

		if (engine.capabilities.producesAudioSource) {
			this.stopAudioReactivity();
		}

		this.deps.editorManager.unregisterEditor(engine.id);
		engine.dispose();
		this.deps.paneCoordinator.removePane(engine.id);
		this.deps.store.engine.setInitialized(engine.id, false);
		this.applyCustomState(engine.id, engine.capabilities.customStateOnDisable);
		return true;
	}

	private async initEngine(engine: IEngine): Promise<void> {
		this.deps.store.engine.initEngineState(engine.id);
		this.applyCustomState(engine.id, engine.capabilities.customStateOnInit);

		const container = await this.deps.paneCoordinator.waitForPane(engine.id);
		await engine.init(this.createEngineContext(engine, container));

		const editor = engine.getEditor();
		if (editor) {
			this.deps.editorManager.registerEditor(engine.id, editor);
		}

		this.applyEditorSettings();

		if (engine.capabilities.producesAudioSource) {
			this.startAudioReactivity();
		}
	}

	private createEngineContext(engine: IEngine, editorContainer: HTMLElement): EngineContext {
		const context: EngineContext = {
			editorContainer,
			visualContainer: document.body,
			getSettings: this.deps.store.settings.getSettings,
			callbacks: {
				onRenderOverlay: this.deps.render,
				onSaveCode: (code: string) => this.deps.storage.saveEngineCode(engine.id, code),
			},
			getInitialCode: () => this.deps.storage.loadEngineCode(engine.id),
			toggleUI: this.deps.toggleUI,
			changeFontSize: this.deps.changeFontSize,
		};

		if (engine.capabilities.supportsReconnect) {
			context.onRunnerConnected = () => {
				this.deps.store.engine.setCustomState(engine.id, 'runnerUnavailable', false);
				this.deps.store.engine.setCustomState(engine.id, 'runnerReconnecting', false);
			};
			context.onRunnerDisconnected = () => {
				this.deps.store.engine.setCustomState(engine.id, 'runnerUnavailable', true);
				this.deps.store.engine.setCustomState(engine.id, 'runnerReconnecting', false);
			};
		}

		return context;
	}

	private applyCustomState(engineId: EngineId, customState: Record<string, unknown> | undefined): void {
		if (!customState) return;
		for (const [key, value] of Object.entries(customState)) {
			this.deps.store.engine.setCustomState(engineId, key, value);
		}
	}

	private shouldRunEngine(engine: IEngine): boolean {
		if (!engine.capabilities.requiresTransportGate) return true;
		return this.deps.store.settings.getSettings().strudelTransport === 'playing';
	}

	private getTransportEngines(): IEngine[] {
		return this.getRegisteredEngines().filter((engine) => engine.capabilities.supportsTransportControl);
	}

	private pauseTransportEngines(targetEngines: IEngine[] = this.getTransportEngines()): void {
		for (const engine of targetEngines) {
			if (!engine.isInitialized()) continue;
			const controller = engine.getController();
			if (hasTransportPause(controller)) {
				controller.handleTransportPause();
				continue;
			}
			if (hasHush(engine)) {
				engine.hush();
			}
		}
	}

	private reconnectEngine(engineId: EngineId): boolean {
		const engine = this.getEngine(engineId);
		if (!engine || !engine.capabilities.supportsReconnect) return false;
		if (!hasReconnectRuntime(engine)) return false;
		engine.reconnectRuntime();
		return true;
	}

	private applyApprovedSketchToEngine(engineId: EngineId, sketch: ApprovedSketch): void {
		const code = this.getApprovedSketchCode(engineId, sketch);
		const engine = this.getEngine(engineId);
		if (!engine) return;

		if (code === null) {
			if (engine.capabilities.supportsTransportControl) {
				this.pauseTransportEngines([engine]);
			}
			return;
		}

		if (!engine.isInitialized() && engine.capabilities.bootStrategy === 'toggleable') {
			return;
		}

		engine.setCode(code, { silent: true });

		if (engine.capabilities.bootStrategy === 'eager' && hasRuntimeForceRun(engine)) {
			engine.getRuntime()?.forceRun(code);
			return;
		}

		if (this.shouldRunEngine(engine)) {
			engine.getController()?.handleForceRun();
			return;
		}

		if (engine.capabilities.supportsTransportControl) {
			this.pauseTransportEngines([engine]);
		}
	}

	private getApprovedSketchCode(engineId: EngineId, sketch: ApprovedSketch): string | null {
		if (engineId === 'textmode') {
			return sketch.textmodeCode;
		}
		if (engineId === 'strudel') {
			return sketch.strudelCode ?? null;
		}
		return null;
	}

	private getAudioInputEngines(): AudioInputEngine[] {
		return this.getRegisteredEngines().filter((engine): engine is AudioInputEngine => (
			Boolean(engine.capabilities.consumesAudioInput) &&
			hasAudioInput(engine)
		));
	}

	private hasAudioPipeline(): boolean {
		const hasProducer = this.getRegisteredEngines().some((engine) => (
			Boolean(engine.capabilities.producesAudioSource) && engine.isInitialized()
		));
		return hasProducer && this.getAudioInputEngines().length > 0;
	}

	private broadcastAudioData(data: AudioData): void {
		for (const engine of this.getAudioInputEngines()) {
			engine.sendAudioData(data);
		}
	}

	private startAudioReactivity(): void {
		if (this.audioUnsubscribe || !this.hasAudioPipeline()) return;

		audioService.setSource(this.deps.createAudioSource());
		this.audioUnsubscribe = audioService.subscribe((data) => {
			this.broadcastAudioData(data);
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
		this.broadcastAudioData({
			fft: new Array(snapshot.fft.length).fill(0),
			waveform: new Array(snapshot.waveform.length).fill(128),
			timestamp: performance.now(),
		});
	}
}

function hasTransportPause(controller: IController | null): controller is TransportPauseController {
	return Boolean(controller) && typeof (controller as TransportPauseController).handleTransportPause === 'function';
}

function hasReconnectRuntime(engine: IEngine): engine is ReconnectableEngine {
	return typeof (engine as ReconnectableEngine).reconnectRuntime === 'function';
}

function hasAudioInput(engine: IEngine): engine is AudioInputEngine {
	return typeof (engine as AudioInputEngine).sendAudioData === 'function';
}

function hasRuntimeForceRun(engine: IEngine): engine is RuntimeForceRunEngine {
	return typeof (engine as RuntimeForceRunEngine).getRuntime === 'function';
}

function hasHush(engine: IEngine): engine is HushableEngine {
	return typeof (engine as HushableEngine).hush === 'function';
}
