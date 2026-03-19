import type { IErrorReporter } from './textmode.types';
import type { RunnerToParentMessage } from '@synth.textmode.art/contracts/runner/textmode';
import { normalizeError } from '@/core/errors/normalizeError';

export type RunnerMessageSender = (msg: RunnerToParentMessage) => void;

/**
 * Sends error messages to the parent window
 */
export class ErrorReporter implements IErrorReporter {
    private readonly sendMessage: RunnerMessageSender;

    constructor(sendMessage: RunnerMessageSender) {
        this.sendMessage = sendMessage;
    }

    /**
     * Report an error to the parent window
     */
    report(error: Error | string | Event): void {
        const runtimeError = normalizeError(error);
        this.sendMessage({
            type: 'RUN_ERROR',
            message: runtimeError.message,
            stack: runtimeError.stack,
            line: runtimeError.line,
            column: runtimeError.column,
        });
    }
}
