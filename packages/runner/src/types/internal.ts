import type { CodeError, ExecutionResult, ValidationResult, PendingExecution } from '@synth.textmode.art/contracts/runner/common';

export type { CodeError, ExecutionResult, ValidationResult, PendingExecution };

export interface IErrorReporter {
	report(error: Error | string | Event): void;
}

export interface IFrameScheduler {
	schedule(execution: PendingExecution): void;
	cancel(): void;
}
