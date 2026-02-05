
import type { CodeError } from '@/types/app.types';
import type { MiniLocation } from '@strudel/core';

export interface StrudelRuntimeOptions {
	onReady?: () => void;
	onError?: (error: CodeError) => void;
	onPatternUpdate?: (pattern: StrudelPattern | null) => void;
	onPlayStateChange?: (isPlaying: boolean) => void;
}

/** Minimal pattern interface for querying haps */
export interface StrudelPattern {
	queryArc(begin: number, end: number): StrudelHap[];
}

export interface StrudelHapLocation {
	start: number;
	end: number;
}

export interface StrudelHap {
	whole?: { begin: { valueOf(): number }; end: { valueOf(): number }; duration: number };
	part?: { begin: { valueOf(): number }; end: { valueOf(): number } };
	context?: {
		locations?: StrudelHapLocation[];
	};
	value?: Record<string, unknown>;
	hasOnset(): boolean;
}

export interface StrudelScheduler {
	now(): number;
	cps: number;
	started: boolean;
}

/** Repl interface from @strudel/core */
interface StrudelRepl {
	scheduler: StrudelScheduler & {
		setPattern(pattern: StrudelPattern, autostart?: boolean): Promise<void>;
		stop(): void;
		start(): void;
	};
	evaluate(code: string, autostart?: boolean): Promise<StrudelPattern>;
	start(): void;
	stop(): void;
	state: {
		miniLocations: MiniLocation[];
		pattern?: StrudelPattern;
		started: boolean;
	};
}

/**
 * Strudel audio runtime with miniLocations support
 */
export class StrudelRuntime {
	readonly strategy = 'direct' as const;

	private _isInitialized = false;
	private isPlaying = false;
	private options: StrudelRuntimeOptions;
	private repl: StrudelRepl | null = null;
	private currentPattern: StrudelPattern | null = null;
	private pendingCode: string | null = null;
	private evalErrorOccurred = false;

	constructor(options: StrudelRuntimeOptions) {
		this.options = options;
	}

	/**
	 * Initialize Strudel audio engine.
	 * Must be called after user interaction due to Web Audio autoplay policy.
	 */
	async init(): Promise<void> {
		if (this._isInitialized) return;

		try {
			// Import Strudel modules that are available
			const strudelCore = await import('@strudel/core');
			const strudelTranspiler = await import('@strudel/transpiler');
			const strudelWebaudio = await import('@strudel/webaudio');
			const strudelMini = await import('@strudel/mini');
			const strudelTonal = await import('@strudel/tonal');

			// Initialize Web Audio
			await strudelWebaudio.initAudio();

			// Register modules in eval scope
			await strudelCore.evalScope(
				strudelCore,
				strudelMini,
				strudelTonal,
				strudelWebaudio,
				strudelCore.controls
			);

			// Load samples
			try {
				await Promise.all([
					strudelWebaudio.samples('github:tidalcycles/dirt-samples'),
					strudelWebaudio.registerSynthSounds(),
					strudelWebaudio.registerZZFXSounds(),
				]);
			} catch (err) {
				console.warn('[StrudelRuntime] Failed to load some samples:', err);
			}

			// Create repl with afterEval callback to capture miniLocations
			this.repl = strudelCore.repl({
				defaultOutput: strudelWebaudio.webaudioOutput,
				onEvalError: (e: unknown) => {
					this.evalErrorOccurred = true;
					const parsed = this.parseError(e as Error);
					this.options.onError?.(parsed);
				},
				getTime: () => strudelWebaudio.getAudioContext().currentTime,
				transpiler: strudelTranspiler.transpiler,
			}) as unknown as StrudelRepl;

			this._isInitialized = true;
			this.options.onReady?.();

			// Run pending code if any
			if (this.pendingCode !== null) {
				await this.evaluateImmediate(this.pendingCode);
				this.pendingCode = null;
			}
		} catch (error) {
			console.error('Failed to initialize Strudel:', error);
			this.options.onError?.({
				message: error instanceof Error ? error.message : 'Failed to initialize Strudel audio',
			});
		}
	}

	/**
	 * Check if runtime is initialized
	 */
	isInitialized(): boolean {
		return this._isInitialized;
	}

	/**
	 * Run code immediately.
	 */
	forceRun(code: string): void {
		this.evaluateImmediate(code);
	}

	/**
	 * Cleanup
	 */
	dispose(): void {
		this.hush();
	}

	/**
	 * Stop all audio (hush).
	 */
	hush(): void {
		if (!this._isInitialized) return;

		try {
			if (this.repl) {
				this.repl.stop();
			}
			this.currentPattern = null;
			this.isPlaying = false;
			this.options.onPlayStateChange?.(false);
			this.options.onPatternUpdate?.(null);
		} catch (error) {
			console.error('Failed to stop Strudel:', error);
		}
	}

	/**
	 * Check if audio is currently playing
	 */
	getIsPlaying(): boolean {
		return this.isPlaying;
	}

	/**
	 * Get the current pattern for highlighting purposes
	 */
	getPattern(): StrudelPattern | null {
		return this.currentPattern;
	}

	/**
	 * Get the current cycle position from the scheduler
	 */
	getCycle(): number {
		if (!this.repl?.scheduler) return 0;
		return this.repl.scheduler.now();
	}

	/**
	 * Get the scheduler's audio time function
	 */
	getTime(): number {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const audioContext = (window as any).strudel?.audioContext;
			if (audioContext) {
				return audioContext.currentTime;
			}
		} catch {
			// Fallback to performance time
		}
		return performance.now() / 1000;
	}

	/**
	 * Evaluate Strudel code immediately
	 */
	private async evaluateImmediate(code: string): Promise<void> {
		if (!this._isInitialized || !this.repl) {
			this.pendingCode = code;
			return;
		}

		this.evalErrorOccurred = false;

		try {
			// Use repl.evaluate which will trigger afterEval callback
			const pattern = await this.repl.evaluate(code, true);

			// If onEvalError was called, don't update pattern
			if (this.evalErrorOccurred) {
				return;
			}

			this.currentPattern = pattern;
			this.isPlaying = true;
			this.options.onPlayStateChange?.(true);
			this.options.onPatternUpdate?.(this.currentPattern);
		} catch (error) {
			const err = error as Error;
			const parsed = this.parseError(err);
			this.options.onError?.(parsed);
		}
	}

	/**
	 * Parse an error into a CodeError structure.
	 */
	private parseError(error: Error): CodeError {
		const message = error.message;
		const stack = error.stack;

		let line: number | undefined;
		let column: number | undefined;

		const lineMatch = message.match(/line (\d+)/i);
		const colMatch = message.match(/column (\d+)/i);

		if (lineMatch) {
			line = parseInt(lineMatch[1], 10);
		}
		if (colMatch) {
			column = parseInt(colMatch[1], 10);
		}

		if (line === undefined && stack) {
			const parsed = this.parseStackTrace(stack);
			line = parsed.line;
			column = parsed.column;
		}

		return { message, stack, line, column };
	}

	/**
	 * Parse stack trace to extract line and column numbers.
	 */
	private parseStackTrace(stack: string): { line?: number; column?: number } {
		const anonMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
		if (anonMatch) {
			return {
				line: parseInt(anonMatch[1], 10),
				column: parseInt(anonMatch[2], 10),
			};
		}

		const evalMatch = stack.match(/eval[^:]*:(\d+):(\d+)/);
		if (evalMatch) {
			return {
				line: parseInt(evalMatch[1], 10),
				column: parseInt(evalMatch[2], 10),
			};
		}

		const fnMatch = stack.match(/Function:(\d+):(\d+)/);
		if (fnMatch) {
			return {
				line: parseInt(fnMatch[1], 10),
				column: parseInt(fnMatch[2], 10),
			};
		}

		return {};
	}
}
