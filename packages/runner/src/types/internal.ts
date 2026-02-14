export interface CodeError {
	message: string;
	stack?: string;
	line?: number;
	column?: number;
	source?: string;
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
