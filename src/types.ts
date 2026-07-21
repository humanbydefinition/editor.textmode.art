/**
 * Application-wide type definitions.
 * Centralized types used across the UI and application logic.
 */

/**
 * Application settings persisted to localStorage.
 */
export interface AppSettings {
	/** Run code automatically on changes */
	autoExecute: boolean;
	/** Show dark glass backdrop behind editor text */
	editorBackdrop: boolean;
	/** Editor font size in pixels */
	fontSize: number;
	/** Whether UI overlays are visible */
	uiVisible: boolean;
	/** Whether line numbers are shown in the editor */
	lineNumbers: boolean;
	/** Delay in milliseconds before auto-executing code */
	autoExecuteDelay: number;
}

/**
 * Default application settings.
 */
export const DEFAULT_SETTINGS: AppSettings = {
	autoExecute: true,
	editorBackdrop: true,
	fontSize: 16,
	uiVisible: true,
	lineNumbers: false,
	autoExecuteDelay: 500,
};

/**
 * Error information for display in the UI and marker creation.
 * Consolidates error reporting across runtimes and controllers.
 */
export interface CodeError {
	/** Error message */
	message: string;
	/** Full stack trace */
	stack?: string;
	/** Line number in user code (1-indexed) */
	line?: number;
	/** Column number in user code (1-indexed) */
	column?: number;
	/** Source of the error (e.g., 'textmode') */
	source?: string;
}

/**
 * Mobile breakpoint in pixels.
 */
export const MOBILE_BREAKPOINT = 768;
