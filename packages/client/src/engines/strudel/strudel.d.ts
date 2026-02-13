/**
 * Type declarations for Strudel packages
 */

declare module '@strudel/core' {
	/**
	 * MiniLocation represents a source code location from the transpiler.
	 * Used for highlighting patterns in the editor.
	 */
	export interface MiniLocation {
		start: { line: number; column: number; offset: number };
		end: { line: number; column: number; offset: number };
	}

	/**
	 * Evaluation metadata provided in afterEval callback
	 */
	export interface EvalMeta {
		miniLocations?: MiniLocation[];
	}

	/**
	 * Options for afterEval callback
	 */
	export interface AfterEvalOptions {
		code: string;
		pattern: unknown;
		meta?: EvalMeta;
	}

	/**
	 * Options for creating a Strudel REPL
	 */
	export interface ReplOptions {
		/** Default audio output function */
		defaultOutput?: (hap: unknown, deadline: number, duration: number) => void;
		/** Callback after successful evaluation */
		afterEval?: (options: AfterEvalOptions) => void;
		/** Callback before evaluation */
		beforeEval?: () => void;
		/** Callback for scheduler errors */
		onSchedulerError?: (error: unknown) => void;
		/** Callback for evaluation errors */
		onEvalError?: (error: unknown) => void;
		/** Function to get current audio time */
		getTime?: () => number;
		/** Code transpiler function */
		transpiler?: (code: string) => string;
	}

	/**
	 * Strudel Pattern type
	 */
	export interface Pattern {
		queryArc(begin: number, end: number): Hap[];
	}

	/**
	 * Strudel Hap (musical event) type
	 */
	export interface Hap {
		whole?: { begin: Fraction; end: Fraction; duration: number };
		part?: { begin: Fraction; end: Fraction };
		context?: {
			locations?: Array<{ start: number; end: number }>;
		};
		value?: Record<string, unknown>;
		hasOnset(): boolean;
	}

	/**
	 * Fraction type used in Strudel timing
	 */
	export interface Fraction {
		valueOf(): number;
	}

	/**
	 * Strudel Scheduler
	 */
	export interface Scheduler {
		/** Get current cycle position */
		now(): number;
		/** Cycles per second */
		cps: number;
		/** Whether scheduler is running */
		started: boolean;
		/** Current pattern being played */
		pattern?: Pattern;
		/** Set pattern to play */
		setPattern(pattern: Pattern, autoplay?: boolean): Promise<void>;
	}

	/**
	 * Strudel REPL instance
	 */
	export interface Repl {
		scheduler: Scheduler;
		evaluate(code: string, autoplay?: boolean): Promise<Pattern>;
		start(): void;
		stop(): void;
	}

	/**
	 * Create a Strudel REPL
	 */
	export function repl(options?: ReplOptions): Repl;

	/**
	 * Register modules in the eval scope
	 */
	export function evalScope(...modules: unknown[]): Promise<void>;

	/**
	 * Controls for creating custom pattern parameters
	 */
	export const controls: {
		createParam(name: string): unknown;
	};

	/**
	 * Note to MIDI conversion
	 */
	export function noteToMidi(note: string): number;

	/**
	 * Value to MIDI conversion
	 */
	export function valueToMidi(value: unknown): number;

	/**
	 * Stack multiple patterns
	 */
	export function stack(...patterns: Pattern[]): Pattern;
}

declare module '@strudel/transpiler' {
	/**
	 * Transpiler function for converting Strudel syntax to JavaScript
	 */
	export function transpiler(code: string): string;
}

declare module '@strudel/webaudio' {
	/**
	 * Get the Web Audio AudioContext
	 */
	export function getAudioContext(): AudioContext;

	/**
	 * Initialize Web Audio (must be called after user interaction)
	 */
	export function initAudio(): Promise<void>;

	/**
	 * Web audio output function for patterns
	 */
	export function webaudioOutput(
		hap: unknown,
		deadline: number,
		duration: number
	): void;

	/**
	 * Load samples from a URL or configuration
	 */
	export function samples(config: string | object): Promise<void>;

	/**
	 * Register built-in synth sounds
	 */
	export function registerSynthSounds(): Promise<void>;

	/**
	 * Register ZZFX sounds
	 */
	export function registerZZFXSounds(): Promise<void>;
}

declare module '@strudel/draw' {
	/**
	 * Framer for animation-loop management
	 */
	export class Framer {
		constructor(
			onFrame: () => void,
			onError?: (error: unknown) => void
		);
		start(): void;
		stop(): void;
	}
}

declare module '@strudel/mini' {
	// Re-exports from core, used for mini notation parsing
}

declare module '@strudel/tonal' {
	// Tonal music theory utilities
}

declare module '@strudel/web' {
	export interface StrudelInitOptions {
		/**
		 * Function to load samples before initialization completes
		 */
		prebake?: () => Promise<void>;
		/**
		 * Whether to auto-start the audio scheduler
		 */
		autostart?: boolean;
		/**
		 * Error callback for evaluation errors
		 * Strudel catches errors internally and calls this instead of throwing
		 */
		onEvalError?: (error: Error) => void;
	}

	/**
	 * The Strudel repl instance returned by initStrudel()
	 * Note: hush() and evaluate() are available as module exports, not on this object
	 */
	export interface StrudelRepl {
		/**
		 * Stop all audio patterns
		 */
		stop: () => void;
		/**
		 * The Web Audio scheduler
		 */
		scheduler?: unknown;
	}

	/**
	 * Initialize the Strudel audio engine
	 * Returns the repl object. Note: hush() and evaluate() are module-level exports.
	 */
	export function initStrudel(options?: StrudelInitOptions): Promise<StrudelRepl>;

	/**
	 * Load samples from a URL (usually a GitHub repo)
	 * @param url - Sample source, e.g., 'github:tidalcycles/dirt-samples'
	 */
	export function samples(url: string): Promise<void>;

	/**
	 * Evaluate Strudel code directly (after initialization)
	 * This is a module-level export, not a method on the repl
	 */
	export function evaluate(code: string): Promise<unknown>;

	/**
	 * Stop all audio (hush)
	 * This is a module-level export, not a method on the repl
	 */
	export function hush(): void;
}

declare global {
	interface Window {
		hush?: () => void;
		strudel?: {
			audioContext?: AudioContext;
		};
	}
}
