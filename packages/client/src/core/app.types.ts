/**
 * Application-wide type definitions.
 * Centralized types used across the UI and application logic.
 */

/**
 * Application settings persisted to localStorage.
 */
export type StrudelTransportState = 'paused' | 'playing';

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
	/** Whether Strudel audio is enabled */
	strudelEnabled: boolean;
	/** Whether Strudel transport should currently play audio */
	strudelTransport: StrudelTransportState;
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
	strudelEnabled: true,
	strudelTransport: 'paused',
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
	/** Source of the error (e.g., 'textmode' or 'strudel') */
	source?: string;
}

/**
 * Status indicator states for the application.
 * - ready: waiting for code changes
 * - running: sketch is actively running
 * - updated: code executed successfully (transient state)
 * - error: execution failed
 */
export type StatusState = 'ready' | 'running' | 'updated' | 'error';
