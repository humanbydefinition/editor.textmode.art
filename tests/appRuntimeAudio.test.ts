import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRuntime } from '../src/app/runtime/AppRuntime';
import { useAppStore } from '../src/platform/state/appStore';

vi.mock('@/textmode/TextmodeEngine', () => {
	class TextmodeEngine {
		sendAudioData = vi.fn();
		isInitialized = vi.fn(() => false);
		dispose = vi.fn();
		getCode = vi.fn(() => '');
		getController = vi.fn(() => null);
		getRuntime = vi.fn(() => null);
		setCode = vi.fn();
		reconnectRuntime = vi.fn();
		init = vi.fn(async () => {});
		getEditor = vi.fn(() => null);
	}

	return { TextmodeEngine };
});

describe('AppRuntime audio input state', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('maps missing input devices to no-device state', async () => {
		const runtime = createRuntimeWithAudioService({
			start: vi.fn(async () => {
				throw new DOMException('not found', 'NotFoundError');
			}),
		});

		await callPrivate(runtime, 'enableAudioInput');

		expect(useAppStore.getState().audioInput).toMatchObject({
			enabled: false,
			status: 'no-device',
			error: {
				kind: 'no-device',
				message: 'no audio input device found',
				retryable: true,
			},
		});
	});

	it('maps denied microphone access to permission-denied state', async () => {
		const runtime = createRuntimeWithAudioService({
			start: vi.fn(async () => {
				throw new DOMException('denied', 'NotAllowedError');
			}),
		});

		await callPrivate(runtime, 'enableAudioInput');

		expect(useAppStore.getState().audioInput).toMatchObject({
			enabled: false,
			status: 'permission-denied',
			permission: 'denied',
			error: {
				kind: 'permission-denied',
				message: 'microphone permission is blocked',
				retryable: true,
			},
		});
	});

	it('throttles UI level updates while forwarding every service frame to the runner', () => {
		const runtime = createRuntimeWithAudioService();
		const sendAudioData = vi.fn();
		(runtime as unknown as { textmodeEngine: { sendAudioData: typeof sendAudioData } }).textmodeEngine = {
			sendAudioData,
		};

		callPrivate(runtime, 'handleAudioInputFrame', {
			fft: new Uint8Array([1]),
			waveform: new Uint8Array([128]),
			timestamp: 100,
			level: 0.4,
		});
		callPrivate(runtime, 'handleAudioInputFrame', {
			fft: new Uint8Array([2]),
			waveform: new Uint8Array([129]),
			timestamp: 120,
			level: 0.8,
		});

		expect(sendAudioData).toHaveBeenCalledTimes(2);
		expect(useAppStore.getState().audioInput.level).toBe(0.4);
	});

	it('stops input, emits silence through the service, and returns to idle', () => {
		const stop = vi.fn();
		const runtime = createRuntimeWithAudioService({ stop });

		callPrivate(runtime, 'disableAudioInput');

		expect(stop).toHaveBeenCalledWith({ emitSilence: true });
		expect(useAppStore.getState().audioInput).toMatchObject({
			enabled: false,
			status: 'idle',
			level: 0,
			error: null,
		});
	});

	it('reattaches audio service callbacks when a disposed runtime instance is initialized again', () => {
		const service = createFakeAudioInputService();
		const runtime = new AppRuntime();
		const runtimeInternals = runtime as unknown as {
			audioInputService: FakeAudioInputService;
			audioInputUnsubscribe: (() => void) | null;
			audioDeviceChangeUnsubscribe: (() => void) | null;
		};
		runtimeInternals.audioInputUnsubscribe = null;
		runtimeInternals.audioDeviceChangeUnsubscribe = null;
		runtimeInternals.audioInputService = service;

		callPrivate(runtime, 'attachAudioInputService');
		expect(service.subscribe).toHaveBeenCalledTimes(1);
		expect(service.subscribeToDeviceChanges).toHaveBeenCalledTimes(1);

		runtime.dispose();
		callPrivate(runtime, 'attachAudioInputService');

		expect(service.subscribe).toHaveBeenCalledTimes(2);
		expect(service.subscribeToDeviceChanges).toHaveBeenCalledTimes(2);
	});
});

function createRuntimeWithAudioService(overrides: Partial<FakeAudioInputService> = {}): AppRuntime {
	useAppStore.getState().setAudioInput({
		enabled: false,
		status: 'idle',
		permission: 'unknown',
		isRefreshingDevices: false,
		devices: [],
		selectedDeviceId: '',
		level: 0,
		error: null,
	});

	const runtime = new AppRuntime();
	const service: FakeAudioInputService = createFakeAudioInputService(overrides);

	(runtime as unknown as { audioInputService: FakeAudioInputService }).audioInputService = service;
	return runtime;
}

function createFakeAudioInputService(overrides: Partial<FakeAudioInputService> = {}): FakeAudioInputService {
	return {
		isSupported: vi.fn(() => true),
		start: vi.fn(async () => ''),
		stop: vi.fn(),
		dispose: vi.fn(),
		listDevices: vi.fn(async () => []),
		subscribe: vi.fn(() => vi.fn()),
		subscribeToDeviceChanges: vi.fn(() => vi.fn()),
		...overrides,
	};
}

function callPrivate<T>(runtime: AppRuntime, methodName: string, ...args: unknown[]): T {
	return (runtime as unknown as Record<string, (...methodArgs: unknown[]) => T>)[methodName](...args);
}

interface FakeAudioInputService {
	isSupported: ReturnType<typeof vi.fn>;
	start: ReturnType<typeof vi.fn>;
	stop: ReturnType<typeof vi.fn>;
	dispose: ReturnType<typeof vi.fn>;
	listDevices: ReturnType<typeof vi.fn>;
	subscribe: ReturnType<typeof vi.fn>;
	subscribeToDeviceChanges: ReturnType<typeof vi.fn>;
}
