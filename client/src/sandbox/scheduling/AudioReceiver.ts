import type { AudioDataMessage } from '../protocol';

/** Default FFT bin count */
const DEFAULT_BIN_COUNT = 512;

/**
 * Audio receiver that processes incoming audio data from the parent window.
 * Exposes processed audio values for use in user sketches.
 */
export class AudioReceiver {
	private fftData: Uint8Array<ArrayBuffer>;
	private waveformData: Uint8Array<ArrayBuffer>;
	private lastTimestamp = 0;
	private _fftSize = 1024;

	constructor() {
		this.fftData = new Uint8Array(DEFAULT_BIN_COUNT);
		this.waveformData = new Uint8Array(DEFAULT_BIN_COUNT * 2);
	}

	/**
	 * Update with new audio data from parent window
	 */
	update(msg: AudioDataMessage): void {
		// Resize buffers if needed
		if (msg.fft.length !== this.fftData.length) {
			this.fftData = new Uint8Array(msg.fft.length);
			this._fftSize = msg.fft.length * 2;
		}
		if (msg.waveform.length !== this.waveformData.length) {
			this.waveformData = new Uint8Array(msg.waveform.length);
		}

		// Copy data into typed arrays
		this.fftData.set(msg.fft);
		this.waveformData.set(msg.waveform);
		this.lastTimestamp = msg.timestamp;
	}

	/**
	 * Get the current FFT size
	 */
	get fftSize(): number {
		return this._fftSize;
	}

	/**
	 * Get raw FFT frequency data (0-255 per bin)
	 * Returns a copy to prevent external modification.
	 */
	getFft(): Uint8Array<ArrayBuffer> {
		return new Uint8Array(this.fftData);
	}

	/**
	 * Get raw time-domain waveform data (0-255, 128 = silence)
	 * Returns a copy to prevent external modification.
	 */
	getWaveform(): Uint8Array<ArrayBuffer> {
		return new Uint8Array(this.waveformData);
	}

	/**
	 * Get bass frequency level (0-1)
	 * Averages the lowest ~10% of frequency bins (roughly 0-500Hz at 44.1kHz)
	 */
	getBass(): number {
		const binCount = this.fftData.length;
		if (binCount === 0) return 0;

		// Use first 10% of bins for bass
		const bassEnd = Math.max(1, Math.floor(binCount * 0.1));
		let sum = 0;
		for (let i = 0; i < bassEnd; i++) {
			sum += this.fftData[i];
		}
		return sum / (bassEnd * 255);
	}

	/**
	 * Get mid frequency level (0-1)
	 * Averages bins from ~10% to ~50% (roughly 500Hz-5kHz at 44.1kHz)
	 */
	getMid(): number {
		const binCount = this.fftData.length;
		if (binCount === 0) return 0;

		const midStart = Math.floor(binCount * 0.1);
		const midEnd = Math.floor(binCount * 0.5);
		if (midStart >= midEnd) return 0;

		let sum = 0;
		for (let i = midStart; i < midEnd; i++) {
			sum += this.fftData[i];
		}
		return sum / ((midEnd - midStart) * 255);
	}

	/**
	 * Get high frequency level (0-1)
	 * Averages bins from ~50% to 100% (roughly 5kHz+ at 44.1kHz)
	 */
	getHigh(): number {
		const binCount = this.fftData.length;
		if (binCount === 0) return 0;

		const highStart = Math.floor(binCount * 0.5);
		if (highStart >= binCount) return 0;

		let sum = 0;
		for (let i = highStart; i < binCount; i++) {
			sum += this.fftData[i];
		}
		return sum / ((binCount - highStart) * 255);
	}

	/**
	 * Get overall volume level (0-1)
	 * Computed as RMS of the waveform data.
	 */
	getVolume(): number {
		const len = this.waveformData.length;
		if (len === 0) return 0;

		let sumSquares = 0;
		for (let i = 0; i < len; i++) {
			// Center around 0 (-1 to 1 range)
			const normalized = (this.waveformData[i] - 128) / 128;
			sumSquares += normalized * normalized;
		}
		return Math.sqrt(sumSquares / len);
	}

	/**
	 * Get the timestamp of the last audio data update
	 */
	getTimestamp(): number {
		return this.lastTimestamp;
	}

	/**
	 * Check if audio data has been received
	 */
	hasData(): boolean {
		return this.lastTimestamp > 0;
	}
}
