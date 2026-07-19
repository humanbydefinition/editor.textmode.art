import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioInputService, type AudioInputFrame } from '../src/platform/audio/AudioInputService';

describe('AudioInputService', () => {
	let analyser: FakeAnalyserNode;
	let source: FakeMediaStreamAudioSourceNode;
	let context: FakeAudioContext;
	let stream: FakeMediaStream;
	let fallbackStream: FakeMediaStream;
	let rafCallback: FrameRequestCallback | null;
	let mediaDevices: {
		getUserMedia: ReturnType<typeof vi.fn>;
		enumerateDevices: ReturnType<typeof vi.fn>;
		addEventListener: ReturnType<typeof vi.fn>;
		removeEventListener: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		analyser = new FakeAnalyserNode();
		source = new FakeMediaStreamAudioSourceNode();
		context = new FakeAudioContext(analyser, source);
		stream = new FakeMediaStream();
		fallbackStream = new FakeMediaStream();
		rafCallback = null;

		vi.stubGlobal(
			'AudioContext',
			vi.fn(function AudioContextMock() {
				return context;
			})
		);
		vi.stubGlobal(
			'requestAnimationFrame',
			vi.fn((callback: FrameRequestCallback) => {
				rafCallback = callback;
				return 123;
			})
		);
		vi.stubGlobal('cancelAnimationFrame', vi.fn());

		mediaDevices = {
			getUserMedia: vi.fn(async () => stream),
			enumerateDevices: vi.fn(async () => [
				{ kind: 'audioinput', deviceId: 'ep-40', label: 'EP-40' },
				{ kind: 'videoinput', deviceId: 'camera', label: 'Camera' },
				{ kind: 'audioinput', deviceId: 'interface', label: '' },
			]),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};

		Object.defineProperty(navigator, 'mediaDevices', {
			configurable: true,
			value: mediaDevices,
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('lists audio input devices with fallback labels', async () => {
		const service = new AudioInputService();

		await expect(service.listDevices()).resolves.toEqual([
			{ deviceId: 'ep-40', label: 'EP-40' },
			{ deviceId: 'interface', label: 'audio input 2' },
		]);
	});

	it('requests default audio without brittle processing constraints', async () => {
		const service = new AudioInputService();

		await expect(service.start()).resolves.toBe('');

		expect(context.resume).toHaveBeenCalledTimes(1);
		expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
			audio: true,
			video: false,
		});
		expect(context.createMediaStreamSource).toHaveBeenCalledWith(stream);
		expect(source.connect).toHaveBeenCalledWith(analyser);
		expect(source.connect).not.toHaveBeenCalledWith(context.destination);
		expect(analyser.fftSize).toBe(1024);
		expect(analyser.smoothingTimeConstant).toBe(0.8);
		expect(rafCallback).toBeTypeOf('function');
	});

	it('starts an analyser for an explicit input', async () => {
		const service = new AudioInputService();
		const frames: AudioInputFrame[] = [];
		service.subscribe((frame) => frames.push(frame));

		await expect(service.start('ep-40')).resolves.toBe('ep-40');

		expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
			audio: {
				deviceId: { exact: 'ep-40' },
			},
			video: false,
		});
		expect(context.resume).toHaveBeenCalledTimes(1);
		expect(Array.from(frames.at(-1)?.fft ?? [])).toEqual([4, 8, 12, 16]);
		expect(Array.from(frames.at(-1)?.waveform.slice(0, 4) ?? [])).toEqual([128, 255, 0, 128]);
		expect(frames.at(-1)?.level).toBeCloseTo(Math.sqrt(((127 / 128) ** 2 + 1) / 1024));
	});

	it('retries selected-device constraint failures with the default input', async () => {
		mediaDevices.getUserMedia
			.mockRejectedValueOnce(new DOMException('Invalid constraint', 'OverconstrainedError'))
			.mockResolvedValueOnce(fallbackStream);
		const service = new AudioInputService();

		await expect(service.start('missing-device')).resolves.toBe('');

		expect(mediaDevices.getUserMedia).toHaveBeenNthCalledWith(2, {
			audio: true,
			video: false,
		});
		expect(context.createMediaStreamSource).toHaveBeenCalledWith(fallbackStream);
	});

	it('rejects non-constraint capture errors unchanged', async () => {
		const domError = new DOMException('denied', 'NotAllowedError');
		mediaDevices.getUserMedia.mockRejectedValueOnce(domError);
		const service = new AudioInputService();

		await expect(service.start()).rejects.toBe(domError);
	});

	it('subscribes and unsubscribes devicechange listeners', () => {
		const service = new AudioInputService();
		const callback = vi.fn();

		const unsubscribe = service.subscribeToDeviceChanges(callback);
		unsubscribe();

		expect(mediaDevices.addEventListener).toHaveBeenCalledWith('devicechange', callback);
		expect(mediaDevices.removeEventListener).toHaveBeenCalledWith('devicechange', callback);
	});

	it('stops polling, cleans up tracks, and emits a silence frame', async () => {
		const service = new AudioInputService();
		const frames: AudioInputFrame[] = [];
		service.subscribe((frame) => frames.push(frame));

		await service.start();
		service.stop();

		expect(cancelAnimationFrame).toHaveBeenCalledWith(123);
		expect(source.disconnect).toHaveBeenCalledTimes(1);
		expect(stream.track.stop).toHaveBeenCalledTimes(1);
		expect(context.close).toHaveBeenCalledTimes(1);
		expect(Array.from(frames.at(-1)?.fft ?? [])).toEqual([0, 0, 0, 0]);
		expect(Array.from(frames.at(-1)?.waveform.slice(0, 4) ?? [])).toEqual([128, 128, 128, 128]);
		expect(frames.at(-1)?.level).toBe(0);
	});
});

class FakeAnalyserNode {
	fftSize = 0;
	smoothingTimeConstant = 0;
	frequencyBinCount = 4;

	getByteFrequencyData(target: Uint8Array): void {
		target.set([4, 8, 12, 16]);
	}

	getByteTimeDomainData(target: Uint8Array): void {
		target.fill(128);
		target.set([128, 255, 0, 128]);
	}
}

class FakeMediaStreamAudioSourceNode {
	connect = vi.fn();
	disconnect = vi.fn();
}

class FakeMediaStream {
	track = { stop: vi.fn() };

	getTracks(): Array<{ stop: () => void }> {
		return [this.track];
	}
}

class FakeAudioContext {
	state: AudioContextState = 'suspended';
	destination = {};
	createAnalyser = vi.fn(() => this.analyser);
	createMediaStreamSource = vi.fn(() => this.source);
	resume = vi.fn(async () => {
		this.state = 'running';
	});
	close = vi.fn(async () => {});

	constructor(
		private readonly analyser: FakeAnalyserNode,
		private readonly source: FakeMediaStreamAudioSourceNode
	) {}
}
