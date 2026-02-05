/**
 * Message protocol for communication between parent window and iframe runner.
 */

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

export type RunnerToParentMessage = ReadyMessage | RunOkMessage | RunErrorMessage | SynthErrorMessage | ToggleUIMessage;

// Messages from parent to runner
export interface RunCodeMessage {
	type: 'RUN_CODE';
	code: string;
}

export interface SoftResetMessage {
	type: 'SOFT_RESET';
	code: string;
}

/**
 * Audio data message for audio-reactive visuals.
 * Sent from parent window to iframe at 60fps with FFT and waveform data.
 */
export interface AudioDataMessage {
	type: 'AUDIO_DATA';
	/** Frequency domain data (0-255 per bin) */
	fft: number[];
	/** Time domain waveform data (0-255) */
	waveform: number[];
	/** Timestamp for synchronization */
	timestamp: number;
}

export type ParentToRunnerMessage = RunCodeMessage | SoftResetMessage | AudioDataMessage;

// Union of all messages
export type Message = RunnerToParentMessage | ParentToRunnerMessage;

/**
 * Type guard for runner-to-parent messages
 */
export function isRunnerMessage(msg: unknown): msg is RunnerToParentMessage {
	if (typeof msg !== 'object' || msg === null) return false;
	const m = msg as { type?: string };
	return m.type === 'READY' || m.type === 'RUN_OK' || m.type === 'RUN_ERROR' || m.type === 'SYNTH_ERROR' || m.type === 'TOGGLE_UI';
}
