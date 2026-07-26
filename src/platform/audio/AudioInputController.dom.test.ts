import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AudioInputController, type AudioInputAdapter } from './AudioInputController';
import type { AudioInputFrame } from './AudioInputService';
import { useAppStore } from '../state/appStore';
import { INITIAL_AUDIO_INPUT_STATE, type AudioInputState } from '../state/slices/audioSlice';

describe('AudioInputController', () => {
	beforeEach(() => {
		useAppStore.getState().setAudioInput({ ...INITIAL_AUDIO_INPUT_STATE });
	});

	it('maps missing input devices to no-device state', async () => {
		const controller = createController({
			start: vi.fn(async () => {
				throw new DOMException('not found', 'NotFoundError');
			}),
		});

		await controller.enable();

		expect(useAppStore.getState().audioInput).toMatchObject({
			status: 'no-device',
			error: { kind: 'no-device', message: 'no audio input device found', retryable: true },
		});
	});

	it('maps denied microphone access to permission-denied state', async () => {
		const controller = createController({
			start: vi.fn(async () => {
				throw new DOMException('denied', 'NotAllowedError');
			}),
		});

		await controller.enable();

		expect(useAppStore.getState().audioInput).toMatchObject({
			status: 'permission-denied',
			permission: 'denied',
			error: { kind: 'permission-denied', message: 'microphone permission is blocked', retryable: true },
		});
	});

	it('throttles UI level updates while forwarding every service frame to its frame sink', () => {
		const service = createFakeAudioInputService();
		const controller = new AudioInputController(service);
		const onFrame = vi.fn();
		controller.init(onFrame);

		service.emitFrame({ fft: new Uint8Array([1]), waveform: new Uint8Array([128]), timestamp: 100, level: 0.4 });
		service.emitFrame({ fft: new Uint8Array([2]), waveform: new Uint8Array([129]), timestamp: 120, level: 0.8 });

		expect(onFrame).toHaveBeenCalledTimes(2);
		expect(useAppStore.getState().audioInput.level).toBe(0.4);
	});

	it('activates after permission acceptance when a device refresh runs during the prompt', async () => {
		const start = createDeferred<string>();
		const controller = createController({
			start: vi.fn(() => start.promise),
			listDevices: vi.fn(async () => [{ deviceId: 'built-in', label: 'Built-in microphone' }]),
		});

		const enable = controller.enable('built-in');
		const refresh = controller.refresh();
		start.resolve('built-in');
		await Promise.all([enable, refresh]);

		expect(useAppStore.getState().audioInput).toMatchObject({
			status: 'active',
			permission: 'granted',
			selectedDeviceId: 'built-in',
		});
	});

	it('stops input, emits silence through the service, and returns to idle', () => {
		const service = createFakeAudioInputService();
		const controller = new AudioInputController(service);

		controller.disable();

		expect(service.stop).toHaveBeenCalledWith({ emitSilence: true });
		expect(useAppStore.getState().audioInput).toMatchObject({ status: 'idle', level: 0, error: null });
	});

	it('ignores device refresh results from a disposed controller lifecycle', async () => {
		const devices = createDeferred<Array<{ deviceId: string; label: string }>>();
		const controller = createController({ listDevices: vi.fn(() => devices.promise) });

		const refresh = controller.refresh();
		controller.dispose();
		setCurrentLifecycleAudioState();
		devices.resolve([{ deviceId: 'old-device', label: 'old input' }]);
		await refresh;

		expect(useAppStore.getState().audioInput).toEqual(CURRENT_LIFECYCLE_AUDIO_STATE);
	});

	it('ignores device refresh failures from a disposed controller lifecycle', async () => {
		const devices = createDeferred<Array<{ deviceId: string; label: string }>>();
		const controller = createController({ listDevices: vi.fn(() => devices.promise) });

		const refresh = controller.refresh();
		controller.dispose();
		setCurrentLifecycleAudioState();
		devices.reject(new Error('old refresh failed'));
		await refresh;

		expect(useAppStore.getState().audioInput).toEqual(CURRENT_LIFECYCLE_AUDIO_STATE);
	});

	it('ignores completed audio enable work from a disposed controller lifecycle', async () => {
		const devices = createDeferred<Array<{ deviceId: string; label: string }>>();
		const listDevices = vi.fn(() => devices.promise);
		const controller = createController({ start: vi.fn(async () => 'old-device'), listDevices });

		const enable = controller.enable('old-device');
		await vi.waitFor(() => expect(listDevices).toHaveBeenCalledOnce());
		controller.dispose();
		setCurrentLifecycleAudioState();
		devices.resolve([{ deviceId: 'old-device', label: 'old input' }]);
		await enable;

		expect(useAppStore.getState().audioInput).toEqual(CURRENT_LIFECYCLE_AUDIO_STATE);
	});

	it('ignores audio enable failures from a disposed controller without stopping current audio', async () => {
		const start = createDeferred<string>();
		const service = createFakeAudioInputService({ start: vi.fn(() => start.promise) });
		const controller = new AudioInputController(service);

		const enable = controller.enable('old-device');
		controller.dispose();
		setCurrentLifecycleAudioState();
		start.reject(new DOMException('denied', 'NotAllowedError'));
		await enable;

		expect(useAppStore.getState().audioInput).toEqual(CURRENT_LIFECYCLE_AUDIO_STATE);
		expect(service.stop).not.toHaveBeenCalled();
	});

	it('attaches audio service callbacks once and reattaches after disposal', () => {
		const service = createFakeAudioInputService();
		const controller = new AudioInputController(service);

		controller.init(vi.fn());
		controller.init(vi.fn());
		expect(service.subscribe).toHaveBeenCalledTimes(1);
		expect(service.subscribeToDeviceChanges).toHaveBeenCalledTimes(1);

		controller.dispose();
		controller.init(vi.fn());
		expect(service.subscribe).toHaveBeenCalledTimes(2);
		expect(service.subscribeToDeviceChanges).toHaveBeenCalledTimes(2);
	});
});

const CURRENT_LIFECYCLE_AUDIO_STATE: AudioInputState = {
	status: 'active',
	permission: 'granted',
	isRefreshingDevices: false,
	devices: [{ deviceId: 'current-device', label: 'current input' }],
	selectedDeviceId: 'current-device',
	level: 0.75,
	error: null,
};

function setCurrentLifecycleAudioState(): void {
	useAppStore.getState().setAudioInput(CURRENT_LIFECYCLE_AUDIO_STATE);
}

function createController(overrides: Partial<FakeAudioInputService> = {}): AudioInputController {
	return new AudioInputController(createFakeAudioInputService(overrides));
}

interface FakeAudioInputService extends AudioInputAdapter {
	isSupported: Mock<AudioInputAdapter['isSupported']>;
	start: Mock<AudioInputAdapter['start']>;
	stop: Mock<AudioInputAdapter['stop']>;
	dispose: Mock<AudioInputAdapter['dispose']>;
	listDevices: Mock<AudioInputAdapter['listDevices']>;
	subscribe: Mock<AudioInputAdapter['subscribe']>;
	subscribeToDeviceChanges: Mock<AudioInputAdapter['subscribeToDeviceChanges']>;
	emitFrame: (frame: AudioInputFrame) => void;
}

function createFakeAudioInputService(overrides: Partial<FakeAudioInputService> = {}): FakeAudioInputService {
	let onFrame: ((frame: AudioInputFrame) => void) | undefined;
	return {
		isSupported: vi.fn(() => true),
		start: vi.fn(async () => ''),
		stop: vi.fn(),
		dispose: vi.fn(),
		listDevices: vi.fn(async () => []),
		subscribe: vi.fn((callback: (frame: AudioInputFrame) => void) => {
			onFrame = callback;
			return vi.fn();
		}),
		subscribeToDeviceChanges: vi.fn(() => vi.fn()),
		emitFrame: (frame) => onFrame?.(frame),
		...overrides,
	};
}

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}
