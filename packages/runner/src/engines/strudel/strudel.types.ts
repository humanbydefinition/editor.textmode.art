export interface StrudelMiniLocation {
	start: { line: number; column: number; offset: number };
	end: { line: number; column: number; offset: number };
}

// External module augmentations
// Using 'any' for these to avoid augmentation errors with untyped modules
export interface StrudelInitOptions {
	autostart?: boolean;
	onEvalError?: (error: Error) => void;
	prebake?: () => Promise<void>;
}

export interface StrudelSchedulerLike {
	now: () => number;
}

export interface StrudelStateLike {
	miniLocations?: Array<StrudelMiniLocation | { start?: unknown; end?: unknown }>;
}

export interface StrudelPatternLike {
	queryArc?: (begin: number, end: number) => Array<{
		whole?: {
			begin: { valueOf(): number };
			end: { valueOf(): number };
		};
		context?: {
			locations?: Array<{ start: number; end: number }>;
		};
	}>;
}

export interface StrudelReplLike {
	scheduler?: StrudelSchedulerLike;
	state?: StrudelStateLike;
	stop?: () => void;
}
