/**
 * Sandbox type definitions.
 * Consolidated types for the iframe sandbox and code execution.
 */

/**
 * Error information for display in the UI and marker creation.
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
 * Events emitted by the runtime
 */
export interface IRuntimeEvents {
    /** Callback when runner frame is ready */
    onReady?: () => void;
    /** Called when code executes successfully */
    onRunOk(timestamp: number): void;
    /** Called when code execution fails */
    onRunError(error: CodeError): void;
    /** Called when a synth dynamic parameter error occurs during rendering */
    onSynthError?(error: CodeError): void;
    /** Called when the toggle UI shortcut is triggered from within the runtime */
    onToggleUI?: () => void;
}

/**
 * Runtime execution strategy type.
 * - 'sandboxed': Runs in iframe, provides security isolation, used for visual plugins
 * - 'direct': Runs in main thread, provides direct API access (Web Audio), used for audio plugins
 */
export type RuntimeStrategy = 'sandboxed' | 'direct';

/**
 * Base runtime interface - minimum contract for all runtimes.
 */
export interface IRuntime {
    /** Run code immediately */
    forceRun(code: string): void;
    /** Clean up resources */
    dispose(): void;
}

/**
 * Sandboxed runtime interface - runs user code in an iframe.
 */
export interface ISandboxedRuntime extends IRuntime {
    readonly strategy: 'sandboxed';
    /** Initialize the iframe */
    init(): void;
    /** Check if iframe is ready to receive code */
    isReady(): boolean;
    /** Soft reset (e.g., reset frame count) and re-run */
    softReset?(code: string): void;
}

/**
 * Host runtime interface - manages iframe lifecycle from parent window.
 */
export interface IHostRuntime extends ISandboxedRuntime {
    /** Soft reset (reset frameCount to 0) and re-run code */
    softReset(code: string): void;
}

/**
 * Options for creating a host runtime
 */
export interface HostRuntimeOptions extends Partial<IRuntimeEvents> {
    /** Path to the runner HTML file */
    runnerUrl: string;
    /** Container element for the iframe */
    container: HTMLElement;
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

/**
 * Error reporter interface
 */
export interface IErrorReporter {
    /** Report an error to the parent window */
    report(error: Error | string | Event): void;
}

/**
 * Frame scheduler interface - handles frame-safe execution timing
 */
export interface IFrameScheduler {
    /** Schedule code execution at the next safe frame boundary */
    schedule(execution: PendingExecution): void;
    /** Cancel any pending execution */
    cancel(): void;
}
