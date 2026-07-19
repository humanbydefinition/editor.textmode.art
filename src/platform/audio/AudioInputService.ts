export interface AudioInputFrame {
	fft: Uint8Array;
	waveform: Uint8Array;
	timestamp: number;
	level: number;
}

export interface AudioInputDevice {
	deviceId: string;
	label: string;
}

export type AudioInputFrameCallback = (frame: AudioInputFrame) => void;

const DEFAULT_FFT_SIZE = 1024;
type AudioByteArray = Uint8Array<ArrayBuffer>;

/**
 * Browser microphone/line-input analyser for external audio-reactive sketches.
 */
export class AudioInputService {
	private callbacks = new Set<AudioInputFrameCallback>();
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private source: MediaStreamAudioSourceNode | null = null;
	private stream: MediaStream | null = null;
	private rafId: number | null = null;
	private fftData: AudioByteArray = createByteArray(DEFAULT_FFT_SIZE / 2);
	private waveformData: AudioByteArray = createSilenceWaveform(DEFAULT_FFT_SIZE);

	subscribe(callback: AudioInputFrameCallback): () => void {
		this.callbacks.add(callback);
		return () => {
			this.callbacks.delete(callback);
		};
	}

	isSupported(): boolean {
		return typeof navigator.mediaDevices?.getUserMedia === 'function' && this.getAudioContextConstructor() !== null;
	}

	subscribeToDeviceChanges(callback: () => void): () => void {
		const mediaDevices = navigator.mediaDevices;
		if (!mediaDevices?.addEventListener || !mediaDevices.removeEventListener) {
			return () => {};
		}

		mediaDevices.addEventListener('devicechange', callback);
		return () => {
			mediaDevices.removeEventListener('devicechange', callback);
		};
	}

	async listDevices(): Promise<AudioInputDevice[]> {
		if (!navigator.mediaDevices?.enumerateDevices) {
			return [];
		}

		const devices = await navigator.mediaDevices.enumerateDevices();
		return devices
			.filter((device) => device.kind === 'audioinput')
			.map((device, index) => ({
				deviceId: device.deviceId,
				label: device.label || `audio input ${index + 1}`,
			}));
	}

	async start(deviceId = ''): Promise<string> {
		if (!this.isSupported()) {
			throw new Error('audio input is not supported in this browser');
		}

		this.stop({ emitSilence: false });

		const requestedDeviceId = deviceId.trim();
		let activeDeviceId = requestedDeviceId;
		let stream: MediaStream;
		try {
			stream = await navigator.mediaDevices.getUserMedia(createConstraints(requestedDeviceId));
		} catch (error) {
			if (!requestedDeviceId || !isConstraintError(error)) {
				throw error;
			}

			stream = await navigator.mediaDevices.getUserMedia(createConstraints(''));
			activeDeviceId = '';
		}

		const AudioContextCtor = this.getAudioContextConstructor();
		if (!AudioContextCtor) {
			stopStream(stream);
			throw new Error('Web Audio is not supported in this browser');
		}

		this.stream = stream;
		this.audioContext = new AudioContextCtor();
		await resumeIfSuspended(this.audioContext);

		this.analyser = this.audioContext.createAnalyser();
		this.analyser.fftSize = DEFAULT_FFT_SIZE;
		this.analyser.smoothingTimeConstant = 0.8;
		this.source = this.audioContext.createMediaStreamSource(this.stream);
		this.source.connect(this.analyser);

		this.fftData = createByteArray(this.analyser.frequencyBinCount);
		this.waveformData = createByteArray(this.analyser.fftSize);
		this.poll();

		return activeDeviceId;
	}

	stop(options: { emitSilence?: boolean } = {}): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}

		this.source?.disconnect();
		this.source = null;
		this.analyser = null;

		if (this.stream) {
			stopStream(this.stream);
			this.stream = null;
		}

		void this.audioContext?.close().catch(() => {
			// Ignore close failures during teardown.
		});
		this.audioContext = null;

		if (options.emitSilence !== false) {
			this.emitSilence();
		}
	}

	dispose(): void {
		this.stop();
		this.callbacks.clear();
	}

	private poll = (): void => {
		if (!this.analyser) return;

		this.analyser.getByteFrequencyData(this.fftData);
		this.analyser.getByteTimeDomainData(this.waveformData);

		const frame: AudioInputFrame = {
			fft: this.fftData.slice(),
			waveform: this.waveformData.slice(),
			timestamp: performance.now(),
			level: computeVolume(this.waveformData),
		};

		this.emit(frame);
		this.rafId = requestAnimationFrame(this.poll);
	};

	private emitSilence(): void {
		this.fftData.fill(0);
		this.waveformData.fill(128);
		this.emit({
			fft: this.fftData.slice(),
			waveform: this.waveformData.slice(),
			timestamp: performance.now(),
			level: 0,
		});
	}

	private emit(frame: AudioInputFrame): void {
		for (const callback of this.callbacks) {
			callback(frame);
		}
	}

	private getAudioContextConstructor(): typeof AudioContext | null {
		const win = window as Window & { webkitAudioContext?: typeof AudioContext };
		return window.AudioContext ?? win.webkitAudioContext ?? null;
	}
}

function createConstraints(deviceId: string): MediaStreamConstraints {
	if (!deviceId) {
		return {
			audio: true,
			video: false,
		};
	}

	return {
		audio: {
			deviceId: { exact: deviceId },
		},
		video: false,
	};
}

function createByteArray(length: number): AudioByteArray {
	return new Uint8Array(new ArrayBuffer(length));
}

function createSilenceWaveform(length: number): AudioByteArray {
	const waveform = createByteArray(length);
	waveform.fill(128);
	return waveform;
}

function computeVolume(waveform: Uint8Array): number {
	if (waveform.length === 0) return 0;

	let sumSquares = 0;
	for (const sample of waveform) {
		const centered = (sample - 128) / 128;
		sumSquares += centered * centered;
	}

	return Math.sqrt(sumSquares / waveform.length);
}

async function resumeIfSuspended(context: AudioContext): Promise<void> {
	if (context.state !== 'suspended') return;

	try {
		await context.resume();
	} catch {
		// Capture can still succeed when the browser defers AudioContext resume.
	}
}

function stopStream(stream: MediaStream): void {
	for (const track of stream.getTracks()) {
		track.stop();
	}
}

function isConstraintError(error: unknown): boolean {
	const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : '';
	const message = error instanceof Error ? error.message.toLowerCase() : '';
	return (
		name === 'OverconstrainedError' ||
		name === 'ConstraintError' ||
		message.includes('invalid constraint') ||
		message.includes('constraint')
	);
}
