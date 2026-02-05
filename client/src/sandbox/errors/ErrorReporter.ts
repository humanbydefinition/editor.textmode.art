import type { IErrorReporter } from '../types';
import type { CodeError } from '../../types/app.types';
import type { RunnerToParentMessage } from '../protocol';

/**
 * Sends error messages to the parent window
 */
export class ErrorReporter implements IErrorReporter {
	/**
	 * Report an error to the parent window
	 */
	report(error: Error | string | Event): void {
		const runtimeError = this.formatError(error);
		this.sendMessage({
			type: 'RUN_ERROR',
			message: runtimeError.message,
			stack: runtimeError.stack,
			line: runtimeError.line,
			column: runtimeError.column,
		});
	}

	/**
	 * Format an error into a CodeError structure
	 */
	private formatError(error: Error | string | Event): CodeError {
		let message = '';
		let stack: string | undefined;
		let line: number | undefined;
		let column: number | undefined;

		if (error instanceof Error) {
			message = error.message;
			stack = error.stack;

			// Extract line/column from stack trace
			const parsed = this.parseStackTrace(stack);
			line = parsed.line;
			column = parsed.column;
		} else if (typeof error === 'string') {
			message = error;
		} else {
			message = String(error);
		}

		return { message, stack, line, column };
	}

	/**
	 * Parse stack trace to extract line and column numbers
	 * The offset accounts for the "use strict" line added during execution
	 */
	parseStackTrace(stack?: string): { line?: number; column?: number } {
		if (!stack) return {};

		// Match pattern like "<anonymous>:5:10"
		const stackMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
		if (stackMatch) {
			// Subtract 1 for the "use strict" line we add
			const line = parseInt(stackMatch[1], 10) - 1;
			const column = parseInt(stackMatch[2], 10);
			return { line, column };
		}

		return {};
	}

	/**
	 * Send message to parent window
	 */
	private sendMessage(msg: RunnerToParentMessage): void {
		window.parent.postMessage(msg, '*');
	}
}
