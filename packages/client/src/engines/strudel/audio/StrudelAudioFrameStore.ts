export interface StrudelAudioFrame {
	fft: Uint8Array;
	waveform: Uint8Array;
	timestamp: number;
}

let latestFrame: StrudelAudioFrame | null = null;

export function setStrudelAudioFrame(frame: StrudelAudioFrame): void {
	latestFrame = frame;
}

export function getStrudelAudioFrame(): StrudelAudioFrame | null {
	return latestFrame;
}

export function clearStrudelAudioFrame(): void {
	latestFrame = null;
}
