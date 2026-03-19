/**
 * Message protocol for communication between parent window and iframe runner.
 */

export const PROTOCOL_VERSION = 1;

// Initial handshake message (window -> runner)
export interface InitMessage {
	type: 'INIT';
	v: typeof PROTOCOL_VERSION;
}

// Messages from runner to parent
export interface ReadyMessage {
	type: 'READY';
}

export interface RunOkMessage {
	type: 'RUN_OK';
	timestamp: number;
}

export interface RunErrorMessage {
	type: 'RUN_ERROR';
	message: string;
	stack?: string;
	line?: number;
	column?: number;
}

/**
 * Synth dynamic parameter error message.
 * Sent when a synth function like .colorama(() => undefined) fails during rendering.
 * Unlike RUN_ERROR, the sketch continues running but with fallback values.
 */
export interface SynthErrorMessage {
	type: 'SYNTH_ERROR';
	message: string;
	uniformName?: string;
}

export interface ToggleUIMessage {
	type: 'TOGGLE_UI';
}

export interface UserInteractionMessage {
	type: 'USER_INTERACTION';
}

export type RunnerToParentMessage =
	| ReadyMessage
	| RunOkMessage
	| RunErrorMessage
	| SynthErrorMessage
	| ToggleUIMessage
	| UserInteractionMessage;

// Messages from parent to runner
export interface RunCodeMessage {
	type: 'RUN_CODE';
	code: string;
}

export interface SoftResetMessage {
	type: 'SOFT_RESET';
	code: string;
}

export interface DisposeMessage {
	type: 'DISPOSE';
}

export type ParentToRunnerMessage = RunCodeMessage | SoftResetMessage | DisposeMessage;

export type WindowToRunnerMessage = InitMessage;

// Union of all messages
export type Message = RunnerToParentMessage | ParentToRunnerMessage | WindowToRunnerMessage;

/**
 * Type guard for runner-to-parent messages
 */
export function isRunnerMessage(msg: unknown): msg is RunnerToParentMessage {
	if (typeof msg !== 'object' || msg === null) return false;
	const m = msg as { type?: string };
	return (
		m.type === 'READY' ||
		m.type === 'RUN_OK' ||
		m.type === 'RUN_ERROR' ||
		m.type === 'SYNTH_ERROR' ||
		m.type === 'TOGGLE_UI' ||
		m.type === 'USER_INTERACTION'
	);
}

/**
 * Type guard for parent-to-runner messages
 */
export function isParentMessage(msg: unknown): msg is ParentToRunnerMessage {
	if (typeof msg !== 'object' || msg === null) return false;
	const m = msg as { type?: string };
	return m.type === 'RUN_CODE' || m.type === 'SOFT_RESET' || m.type === 'DISPOSE';
}

/**
 * Type guard for window-to-runner init message
 */
export function isInitMessage(msg: unknown): msg is InitMessage {
	if (typeof msg !== 'object' || msg === null) return false;
	const m = msg as { type?: string; v?: number };
	return m.type === 'INIT' && m.v === PROTOCOL_VERSION;
}
