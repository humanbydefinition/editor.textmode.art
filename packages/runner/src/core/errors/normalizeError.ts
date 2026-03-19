import type { CodeError } from '@/core/types';

/**
 * Normalizes various error types into a standard CodeError object.
 * Extracts line/column from stack traces when available.
 */
export function normalizeError(error: unknown): CodeError {
	let message = '';
	let stack: string | undefined;
	let line: number | undefined;
	let column: number | undefined;

	if (error instanceof Error) {
		message = error.message;
		stack = error.stack;

		// Extract line/column from stack trace ("<anonymous>:5:10")
		if (stack) {
			const stackMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
			if (stackMatch?.[1] && stackMatch[2]) {
				// Subtract 1 for the "use strict" line added during execution
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
