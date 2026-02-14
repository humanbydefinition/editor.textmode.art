/**
 * Textmode-specific type definitions.
 * These types provide better typing for textmode.js interactions.
 */

import type { Textmodifier } from 'textmode.js';
import type { CodeError } from '@/core/types';

/**
 * Interface for textmode instance management
 */
export interface ITextmodeManager {
    /** Get the textmode instance */
    getInstance(): Textmodifier | null;
    /** Initialize textmode */
    init(): void;
    /** Pause the animation loop */
    pause(): void;
    /** Resume the animation loop */
    resume(): void;
    /** Clean up layers before new execution */
    cleanupLayers(isSoftReset: boolean): void;
    /** Clear synths on all layers (base + user layers) */
    clearAllSynths(): void;
    /** Set up a handler for synth dynamic parameter errors */
    setupSynthErrorHandler(handler: (error: Error) => void): void;
}

/**
 * Synth clear method that textmode layers have
 * This is added by the SynthPlugin
 */
export interface SynthLayer {
    clearSynth(): void;
}

export interface ExecutionResult {
	success: boolean;
	error?: CodeError;
	disposeCallback?: () => void;
}

export interface ValidationResult {
	valid: boolean;
	error?: Error;
}

export interface PendingExecution {
	code: string;
	isSoftReset: boolean;
}

export interface IErrorReporter {
	report(error: Error | string | Event): void;
}

export interface IFrameScheduler {
	schedule(execution: PendingExecution): void;
	cancel(): void;
}
