import type { AppSettings } from './app.types';
import type { BaseControllerCallbacks } from '@/core/controller/BaseController';

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
