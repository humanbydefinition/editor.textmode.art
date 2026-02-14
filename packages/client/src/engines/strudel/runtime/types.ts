import type { CodeError } from '@/core/app.types';

export interface StrudelRuntimeOptions {
	onReady?: () => void;
	onError?: (error: CodeError) => void;
	onPatternUpdate?: (pattern: StrudelPattern | null) => void;
	onPlayStateChange?: (isPlaying: boolean) => void;
}

export interface IStrudelRuntime {
	readonly strategy: 'direct' | 'sandboxed';
	init(): Promise<void>;
	isInitialized(): boolean;
	forceRun(code: string): void;
	dispose(): void;
	hush(): void;
	clearPendingCode(): void;
	getIsPlaying(): boolean;
	getPattern(): StrudelPattern | null;
	getCycle(): number;
	getTime(): number;
}

/** Minimal pattern interface for querying haps */
export interface StrudelPattern {
	queryArc(begin: number, end: number): StrudelHap[];
}

export interface StrudelHap {
	whole?: { begin: { valueOf(): number }; end: { valueOf(): number }; duration: number };
	part?: { begin: { valueOf(): number }; end: { valueOf(): number } };
	context?: {
		locations?: {
			start: number;
			end: number;
		}[];
	};
	value?: Record<string, unknown>;
	hasOnset(): boolean;
}
