/**
 * Common runner types shared between client and runner.
 * These types are used for error reporting, execution results, and scheduling.
 */

/**
 * Error information for display in the UI and marker creation.
 * Consolidates error reporting across runtimes and controllers.
 */
export interface CodeError {
	/** Error message */
	message: string;
	/** Full stack trace */
	stack?: string;
	/** Line number in user code (1-indexed) */
	line?: number;
	/** Column number in user code (1-indexed) */
	column?: number;
	/** Source of the error (e.g., 'textmode' or 'strudel') */
	source?: string;
}

/**
 * Result of code execution
 */
export interface ExecutionResult {
	/** Whether execution succeeded */
	success: boolean;
	/** Error information if failed */
	error?: CodeError;
	/** Optional cleanup function returned by user code */
	disposeCallback?: () => void;
}

/**
 * Validation result for code syntax checking
 */
export interface ValidationResult {
	/** Whether the code is syntactically valid */
	valid: boolean;
	/** Syntax error if invalid */
	error?: Error;
}

/**
 * Pending execution request
 */
export interface PendingExecution {
	/** Code to execute */
	code: string;
	/** Whether this is a soft reset */
	isSoftReset: boolean;
}
