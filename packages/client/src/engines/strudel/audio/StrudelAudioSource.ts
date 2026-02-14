import type { IAudioSource } from '@/platform/audio/AudioService';
import { getStrudelAudioFrame } from './StrudelAudioFrameStore';

const STRUDEL_FRAME_DECAY_MS = 850;

/**
 * Options for StrudelAudioSource
 */
export interface StrudelAudioSourceOptions {
	/** Strudel analyser ID (default: 'main') */
	analyserId?: string;
	/** FFT size (must be power of 2, default 1024) */
	fftSize?: number;
}

/**
 * Audio source adapter for Strudel.
 * Uses iframe-runner audio frames in sandbox mode and falls back to
 * `window.analysers` for same-context/debug environments.
 */
export class StrudelAudioSource implements IAudioSource {
	private analyser: AnalyserNode | null = null;
	private proxyAnalyser: ProxyAnalyser | null = null;
	private readonly analyserId: string;
	private readonly fftSize: number;

	constructor(options: StrudelAudioSourceOptions = {}) {
		this.analyserId = options.analyserId ?? 'main';
		this.fftSize = options.fftSize ?? 1024;
	}

	connect(): boolean {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const analysers = (window as any).analysers as Record<string, AnalyserNode> | undefined;
		if (analysers && analysers[this.analyserId]) {
			this.analyser = analysers[this.analyserId];
			this.analyser.fftSize = this.fftSize;
			this.analyser.smoothingTimeConstant = 0.8;
			return true;
		}

		if (!this.proxyAnalyser) {
			this.proxyAnalyser = new ProxyAnalyser(this.fftSize);
		}
		this.analyser = this.proxyAnalyser as unknown as AnalyserNode;
		return getStrudelAudioFrame() !== null;
	}

	disconnect(): void {
		this.analyser = null;
	}

	getAnalyser(): AnalyserNode | null {
		return this.analyser;
	}
}

class ProxyAnalyser {
	fftSize: number;
	smoothingTimeConstant = 0.8;

	constructor(fftSize: number) {
		this.fftSize = fftSize;
	}

	get frequencyBinCount(): number {
		return Math.max(1, this.fftSize / 2);
	}

	getByteFrequencyData(array: Uint8Array): void {
		const frame = getStrudelAudioFrame();
		if (!frame) {
			array.fill(0);
			return;
		}
		const gain = getFrameGain(frame.timestamp);
		fillFromSource(array, frame.fft, 0, (value) => value * gain);
	}

	getByteTimeDomainData(array: Uint8Array): void {
		const frame = getStrudelAudioFrame();
		if (!frame) {
			array.fill(128);
			return;
		}
		const gain = getFrameGain(frame.timestamp);
		fillFromSource(array, frame.waveform, 128, (value) => 128 + (value - 128) * gain);
	}
}

function getFrameGain(timestamp: number): number {
	const ageMs = Math.max(0, performance.now() - timestamp);
	if (!Number.isFinite(ageMs)) return 0;
	if (ageMs >= STRUDEL_FRAME_DECAY_MS) return 0;
	return 1 - ageMs / STRUDEL_FRAME_DECAY_MS;
}

function fillFromSource(
	target: Uint8Array,
	source: ArrayLike<number>,
	fallback: number,
	transform: (value: number) => number = (value) => value
): void {
	if (source.length === 0) {
		target.fill(fallback);
		return;
	}

	const len = Math.min(target.length, source.length);
	for (let i = 0; i < len; i++) {
		const value = source[i];
		target[i] = Number.isFinite(value) ? clampToByte(transform(value)) : fallback;
	}
	for (let i = len; i < target.length; i++) {
		target[i] = fallback;
	}
}

function clampToByte(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}
