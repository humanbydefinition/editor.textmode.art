import type { MiniLocation } from '@strudel/core';

export interface StrudelSchedulerLike {
	now: () => number;
}

export interface StrudelStateLike {
	miniLocations?: Array<MiniLocation | { start?: unknown; end?: unknown }>;
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
