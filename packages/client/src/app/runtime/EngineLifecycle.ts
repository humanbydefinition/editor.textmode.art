import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import type { SharePayload } from '@synth.textmode.art/contracts/share';
import type { IController } from '@/core/BaseController';
import type { EngineContext, EngineId, IEngine } from '@/core/engine.types';
import { registry } from '@/engines/registry';
import { PaneCoordinator } from '@/features/editor-layout';
import { EditorManager } from '@/platform/input/EditorManager';
import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { IStorageService } from '@/platform/storage/StorageService';

interface EngineLifecycleDependencies {
	paneCoordinator: PaneCoordinator;
	editorManager: EditorManager;
	storage: IStorageService;
	store: AppStoreAdapter;
	render: () => void;
	toggleUI: () => void;
	changeFontSize: (delta: number) => void;
}

interface ReconnectableEngine extends IEngine {
	reconnectRuntime: () => void;
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

	constructor(deps: EngineLifecycleDependencies) {
		this.deps = deps;
	}

	async initEagerEngines(): Promise<void> {
		for (const engine of this.getRegisteredEngines().filter((candidate) => candidate.capabilities.bootStrategy === 'eager')) {
			await this.initEngine(engine);
		}
	}

	applyEditorSettings(): void {
		this.deps.editorManager.applySettings(this.deps.store.settings.getSettings());
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

	reconnectAllRunners(): void {
		for (const engine of this.getRegisteredEngines()) {
			if (!engine.capabilities.supportsReconnect || !engine.isInitialized()) continue;
			if (!hasReconnectRuntime(engine)) continue;
			engine.reconnectRuntime();
		}

		for (const engine of this.getRegisteredEngines()) {
			if (!engine.capabilities.supportsReconnect || !engine.isInitialized()) continue;
			if (!this.shouldRunEngine(engine)) continue;
			engine.getController()?.handleForceRun();
		}
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
				this.deps.store.engine.setCustomState(engine.id, 'runnerReady', true);
			};
			context.onRunnerDisconnected = () => {
				this.deps.store.engine.setCustomState(engine.id, 'runnerUnavailable', true);
				this.deps.store.engine.setCustomState(engine.id, 'runnerReconnecting', false);
				this.deps.store.engine.setCustomState(engine.id, 'runnerReady', false);
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
		return !engine.capabilities.requiresTransportGate;
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
		return null;
	}
}

function hasTransportPause(controller: IController | null): controller is TransportPauseController {
	return Boolean(controller) && typeof (controller as TransportPauseController).handleTransportPause === 'function';
}

function hasReconnectRuntime(engine: IEngine): engine is ReconnectableEngine {
	return typeof (engine as ReconnectableEngine).reconnectRuntime === 'function';
}

function hasRuntimeForceRun(engine: IEngine): engine is RuntimeForceRunEngine {
	return typeof (engine as RuntimeForceRunEngine).getRuntime === 'function';
}

function hasHush(engine: IEngine): engine is HushableEngine {
	return typeof (engine as HushableEngine).hush === 'function';
}
