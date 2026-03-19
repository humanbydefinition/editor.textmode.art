import type { AppSettings } from '@/core/app.types';
import type { IController, BaseControllerCallbacks } from './BaseController';
import type { BaseEditor } from './BaseEditor';

export type EngineId = 'textmode';

/**
 * Lifecycle capability model used by EngineLifecycle to keep orchestration generic.
 */
export interface EngineLifecycleCapabilities {
    /** Whether engine is initialized at app boot or enabled dynamically. */
    bootStrategy: 'eager' | 'toggleable';
    /** Engine execution should be gated by global transport state. */
    requiresTransportGate?: boolean;
    /** Engine controller can react to transport state changes. */
    supportsTransportControl?: boolean;
    /** Engine runtime supports reconnecting its execution environment. */
    supportsReconnect?: boolean;
    /** Custom engine state defaults to apply during initialization. */
    customStateOnInit?: Record<string, unknown>;
    /** Custom engine state defaults to apply when disabling/disposal occurs. */
    customStateOnDisable?: Record<string, unknown>;
}

/**
 * Context provided to engines during initialization.
 */
export interface EngineContext {
    /** Container element for the engine's editor */
    editorContainer: HTMLElement;
    /** Container element for visual output (textmode) */
    visualContainer?: HTMLElement;
    /** Get current application settings */
    getSettings: () => AppSettings;
    /** Callbacks for controller integration */
    callbacks: BaseControllerCallbacks;
    /** Get initial code for the engine */
    getInitialCode: () => string;
    /** Toggle UI visibility callback */
    toggleUI: () => void;
    /** Change font size callback */
    changeFontSize: (delta: number) => void;
    /** Textmode runtime connected callback (optional, textmode-only) */
    onRunnerConnected?: () => void;
    /** Textmode runtime disconnected callback (optional, textmode-only) */
    onRunnerDisconnected?: () => void;
}

/**
 * Interface for a pluggable runtime engine.
 */
export interface IEngine {
    readonly id: EngineId;
    readonly displayName: string;
    readonly description: string;
    readonly capabilities: EngineLifecycleCapabilities;

    /**
     * Initialize the engine interactively.
     */
    init(context: EngineContext): Promise<void>;

    /**
     * Dispose the engine and clean up resources.
     */
    dispose(): void;

    /**
     * Get the editor instance if initialized.
     */
    getEditor(): BaseEditor | null;

    /**
     * Get the controller instance if initialized.
     */
    getController(): IController | null;

    /**
     * Check if the engine is fully initialized.
     */
    isInitialized(): boolean;

    /**
     * Get the current code from the engine's editor.
     */
    getCode(): string;

    /**
     * Set the code in the engine's editor.
     */
    setCode(code: string, options?: { silent?: boolean }): void;
}
