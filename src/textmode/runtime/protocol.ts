/**
 * Message protocol for communication between the synth client and sandbox runner iframe.
 */

export const PROTOCOL_VERSION = 1;

export interface InitMessage {
	type: 'INIT';
	v: typeof PROTOCOL_VERSION;
}

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
