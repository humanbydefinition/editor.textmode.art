import type { AppSettings } from '@/types/app.types';
import type { IController, BaseControllerCallbacks } from './controller/BaseController';
import type { BaseEditor } from './editor/BaseEditor';

export type EngineId = 'textmode' | 'strudel';

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
}

/**
 * Interface for a pluggable runtime engine.
 */
export interface IEngine {
    readonly id: EngineId;
    readonly displayName: string;
    readonly description: string;

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
