import type { CodeError } from '@/core/types';

/**
 * Normalizes various error types into a standard CodeError object.
 * Combines pattern matching from both Textmode and Strudel error reporting.
 */
export function normalizeError(error: unknown): CodeError {
	let message = '';
	let stack: string | undefined;
	let line: number | undefined;
	let column: number | undefined;

	if (error instanceof Error) {
		message = error.message;
		stack = error.stack;

		// Strategy 1: Extract from message (Strudel style: "line 5", "column 10")
		const lineMatch = message.match(/line (\d+)/i);
		const columnMatch = message.match(/column (\d+)/i);

		if (lineMatch?.[1]) {
			line = parseInt(lineMatch[1], 10);
		}
		if (columnMatch?.[1]) {
			column = parseInt(columnMatch[1], 10);
		}

		// Strategy 2: Extract from stack trace (Textmode style: "<anonymous>:5:10")
		// Only if line/column not already found in message
		if (stack && (line === undefined || column === undefined)) {
			const stackMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
			if (stackMatch?.[1] && stackMatch[2]) {
				// Subtract 1 for the "use strict" line added during Textmode execution
				line = parseInt(stackMatch[1], 10) - 1;
				column = parseInt(stackMatch[2], 10);
			}
		}
	} else if (typeof error === 'string') {
		message = error;
	} else if (typeof error === 'object' && error !== null && 'message' in error) {
		// Handle ErrorEvent or other error-like objects
		message = String((error as { message: unknown }).message);
		if ('stack' in error) stack = String((error as { stack: unknown }).stack);
	} else {
		message = String(error);
	}

	return { message, stack, line, column };
}
