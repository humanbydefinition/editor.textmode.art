import type { ExecutionResult, ValidationResult } from '@/sandbox/types';
import { SafeProxyFactory } from './SafeProxyFactory';
import { ErrorReporter } from '@/sandbox/errors/ErrorReporter';
import type { AudioReceiver } from '@/sandbox/scheduling/AudioReceiver';
import {
	src,
	osc,
	noise,
	gradient,
	solid,
	shape,
	char,
	voronoi,
	charColor,
	cellColor,
	paint,
	SynthPlugin,
} from 'textmode.synth.js';
import type { Textmodifier } from 'textmode.js';

/**
 * Synth exports to provide to user code
 */
const SYNTH_GLOBALS = {
	src,
	osc,
	noise,
	gradient,
	solid,
	shape,
	voronoi,
	charColor,
	cellColor,
	paint,
	char,
	SynthPlugin,
};

export interface ExecutionContextOptions {
	/** Get the textmode instance */
	getTextmode: () => Textmodifier | null;
	/** Error reporter instance */
	errorReporter: ErrorReporter;
	/** Audio receiver for audio-reactive sketches */
	audioReceiver: AudioReceiver;
}

/**
 * Manages a single code execution context.
 * Handles the creation of globals, execution of user code, and cleanup.
 */
export class ExecutionContext {
	private userDispose: (() => void) | null = null;
	private drawErrorOccurred = false;
	private proxyFactory: SafeProxyFactory;
	private options: ExecutionContextOptions;

	constructor(options: ExecutionContextOptions) {
		this.options = options;
		this.proxyFactory = new SafeProxyFactory({
			onDrawError: (error) => {
				this.drawErrorOccurred = true;
				this.options.errorReporter.report(error);
			},
			hasDrawError: () => this.drawErrorOccurred,
		});
	}

	/**
	 * Validate code syntax without executing
	 */
	validateSyntax(code: string): ValidationResult {
		try {
			new Function(code);
			return { valid: true };
		} catch (error) {
			return { valid: false, error: error as Error };
		}
	}

	/**
	 * Execute user code
	 */
	execute(code: string): ExecutionResult {
		// Reset draw error state
		this.drawErrorOccurred = false;

		// Dispose previous execution
		this.dispose();

		// Get textmode and create safe proxy
		const t = this.options.getTextmode();
		const safeT = t ? this.proxyFactory.createTextmodeProxy(t) : null;

		// Create audio global for audio-reactive sketches
		const audioReceiver = this.options.audioReceiver;
		const audio = {
			/** Get raw FFT frequency data (0-255 per bin) */
			fft: () => audioReceiver.getFft(),
			/** Get raw time-domain waveform data (0-255, 128 = silence) */
			waveform: () => audioReceiver.getWaveform(),
			/** Get bass frequency level (0-1) */
			bass: () => audioReceiver.getBass(),
			/** Get mid frequency level (0-1) */
			mid: () => audioReceiver.getMid(),
			/** Get high frequency level (0-1) */
			high: () => audioReceiver.getHigh(),
			/** Get overall volume level (0-1) */
			volume: () => audioReceiver.getVolume(),
		};

		// Prepare globals
		const globals: Record<string, unknown> = {
			t: safeT,
			audio,
			...SYNTH_GLOBALS,
		};

		const globalKeys = Object.keys(globals);
		const globalValues = Object.values(globals);

		try {
			// Create and execute function
			const fn = new Function(...globalKeys, `"use strict";\n${code}`);
			const result = fn(...globalValues);

			// Store dispose callback if returned
			if (typeof result === 'function') {
				this.userDispose = result;
			}

			return {
				success: true,
				disposeCallback: this.userDispose ?? undefined,
			};
		} catch (error) {
			return {
				success: false,
				error: {
					message: (error as Error).message,
					stack: (error as Error).stack,
				},
			};
		}
	}

	/**
	 * Check if a draw error has occurred
	 */
	hasDrawError(): boolean {
		return this.drawErrorOccurred;
	}

	/**
	 * Dispose current execution resources
	 */
	dispose(): void {
		// Call user dispose callback
		if (this.userDispose) {
			try {
				this.userDispose();
			} catch (e) {
				console.warn('Error in user dispose:', e);
			}
			this.userDispose = null;
		}
	}
}
