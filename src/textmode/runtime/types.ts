/**
 * Sandbox type definitions.
 * Consolidated types for the iframe sandbox and code execution.
 */

import type { CodeError } from '@/types';

/**
 * Events emitted by the runtime
 */
export interface IRuntimeEvents {
	/** Callback when runner frame is ready */
	onReady?: () => void;
	/** Called when code executes successfully */
	onRunOk(timestamp: number): void;
	/** Called when code execution fails */
	onRunError(error: CodeError): void;
	/** Called when a synth dynamic parameter error occurs during rendering */
	onSynthError?(error: CodeError): void;
	/** Called when the toggle UI shortcut is triggered from within the runtime */
	onToggleUI?: () => void;
	/** Called when the hard reset shortcut is triggered from within the runtime */
	onHardReset?: () => void;
}

/**
 * Host runtime interface - manages iframe lifecycle from parent window.
 * This is a more specific interface for iframe-based runtimes.
 */
export interface IHostRuntime {
	readonly strategy: 'sandboxed';
	/** Initialize the iframe */
	init(): void;
	/** Check if iframe is ready to receive code */
	isReady(): boolean;
	/** Run code immediately */
	forceRun(code: string): void;
	/** Recreate the iframe runtime and run code in a fresh textmode instance */
	hardReset(code: string): void;
	/** Clean up resources */
	dispose(): void;
	/** Soft reset (reset frameCount to 0) and re-run code */
	softReset(code: string): void;
}

/**
 * Options for creating a host runtime
 */
export interface HostRuntimeOptions extends Partial<IRuntimeEvents> {
	/** Path to the runner HTML file */
	runnerUrl: string;
	/** Container element for the iframe */
	container: HTMLElement;
	/** Called when runner connection is established */
	onRunnerConnected?: () => void;
	/** Called when runner is unreachable or disconnected */
	onRunnerDisconnected?: () => void;
}
