import { useAppStore } from '@/platform/state/appStore';
import {
	INITIAL_AUDIO_INPUT_STATE,
	type AudioInputErrorState,
	type AudioInputPermission,
} from '@/platform/state/slices/audioSlice';
import { AudioInputService, isConstraintError, type AudioInputFrame } from './AudioInputService';

const AUDIO_LEVEL_UI_INTERVAL_MS = 1000 / 12;
const getAppState = useAppStore.getState;

export { INITIAL_AUDIO_INPUT_STATE } from '@/platform/state/slices/audioSlice';

/** Coordinates browser audio capture with the application's audio-input state. */
export class AudioInputController {
	private readonly service: AudioInputService;
	private frameUnsubscribe: (() => void) | null = null;
	private deviceChangeUnsubscribe: (() => void) | null = null;
	private captureGeneration = 0;
	private refreshGeneration = 0;
	private lastAudioLevelUiUpdateAt = 0;

	constructor(service = new AudioInputService()) {
		this.service = service;
	}

	init(onFrame: (frame: AudioInputFrame) => void): void {
		if (this.frameUnsubscribe) return;

		this.frameUnsubscribe = this.service.subscribe((frame) => {
			this.updateLevel(frame);
			onFrame(frame);
		});
		this.deviceChangeUnsubscribe = this.service.subscribeToDeviceChanges(() => {
			void this.refresh();
		});
	}

	async refresh(): Promise<void> {
		const operation = this.beginRefresh();
		if (!this.service.isSupported()) {
			this.setUnsupportedState();
			return;
		}

		const current = getAppState().audioInput;
		getAppState().setAudioInput({
			isRefreshingDevices: true,
			status: current.status === 'idle' ? 'checking' : current.status,
			error: current.status === 'active' ? null : current.error,
		});

		try {
			const [devices, permission] = await Promise.all([this.service.listDevices(), queryAudioInputPermission()]);
			if (!this.isCurrentRefresh(operation)) return;

			const latest = getAppState().audioInput;
			const selectedDeviceId =
				latest.selectedDeviceId === '' || devices.some((device) => device.deviceId === latest.selectedDeviceId)
					? latest.selectedDeviceId
					: '';
			getAppState().setAudioInput({
				devices,
				selectedDeviceId,
				permission,
				status: getRefreshStatus(latest.status, permission, devices.length),
				isRefreshingDevices: false,
				error: null,
			});
		} catch (error) {
			if (!this.isCurrentRefresh(operation) || getAppState().audioInput.status === 'requesting') return;
			getAppState().setAudioInput({
				status: 'error',
				isRefreshingDevices: false,
				error: classifyAudioInputError(error),
			});
		}
	}

	async enable(deviceId?: string): Promise<void> {
		const operation = this.beginCapture();
		if (!this.service.isSupported()) {
			this.setUnsupportedState();
			return;
		}

		const current = getAppState().audioInput;
		const selectedDeviceId = deviceId ?? current.selectedDeviceId;
		getAppState().setAudioInput({ status: 'requesting', selectedDeviceId, error: null });

		try {
			const activeDeviceId = await this.service.start(selectedDeviceId || undefined);
			if (!this.isCurrentCapture(operation)) return;
			const devices = await this.service.listDevices();
			if (!this.isCurrentCapture(operation)) return;
			getAppState().setAudioInput({
				status: 'active',
				permission: 'granted',
				isRefreshingDevices: false,
				devices,
				selectedDeviceId: activeDeviceId,
				error: null,
			});
		} catch (error) {
			if (!this.isCurrentCapture(operation)) return;
			this.service.stop({ emitSilence: true });
			const errorState = classifyAudioInputError(error);
			getAppState().setAudioInput({
				status: getAudioErrorStatus(errorState),
				permission: errorState.kind === 'permission-denied' ? 'denied' : current.permission,
				isRefreshingDevices: false,
				level: 0,
				error: errorState,
			});
		}
	}

	disable(): void {
		this.cancelPendingOperations();
		this.service.stop({ emitSilence: true });
		this.lastAudioLevelUiUpdateAt = 0;
		getAppState().setAudioInput({ status: 'idle', isRefreshingDevices: false, level: 0, error: null });
	}

	async select(deviceId: string): Promise<void> {
		getAppState().setAudioInput({ selectedDeviceId: deviceId });
		if (getAppState().audioInput.status === 'active') {
			await this.enable(deviceId);
		}
	}

	dispose(): void {
		this.cancelPendingOperations();
		this.service.dispose();
		this.frameUnsubscribe?.();
		this.frameUnsubscribe = null;
		this.deviceChangeUnsubscribe?.();
		this.deviceChangeUnsubscribe = null;
		this.lastAudioLevelUiUpdateAt = 0;
		getAppState().setAudioInput({ ...INITIAL_AUDIO_INPUT_STATE });
	}

	private beginRefresh(): number {
		this.refreshGeneration += 1;
		return this.refreshGeneration;
	}

	private beginCapture(): number {
		this.captureGeneration += 1;
		return this.captureGeneration;
	}

	private cancelPendingOperations(): void {
		this.refreshGeneration += 1;
		this.captureGeneration += 1;
	}

	private isCurrentRefresh(operation: number): boolean {
		return operation === this.refreshGeneration;
	}

	private isCurrentCapture(operation: number): boolean {
		return operation === this.captureGeneration;
	}

	private setUnsupportedState(): void {
		getAppState().setAudioInput({
			status: 'unavailable',
			permission: 'unknown',
			isRefreshingDevices: false,
			devices: [],
			level: 0,
			error: {
				kind: 'unsupported',
				message: 'audio input is not supported in this browser',
				retryable: false,
			},
		});
	}

	private updateLevel(frame: AudioInputFrame): void {
		if (
			this.lastAudioLevelUiUpdateAt === 0 ||
			frame.timestamp - this.lastAudioLevelUiUpdateAt >= AUDIO_LEVEL_UI_INTERVAL_MS ||
			frame.level === 0
		) {
			this.lastAudioLevelUiUpdateAt = frame.timestamp;
			getAppState().setAudioInput({ level: frame.level });
		}
	}
}

export function classifyAudioInputError(error: unknown): AudioInputErrorState {
	const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : '';
	const normalized = `${name} ${error instanceof Error ? error.message : ''}`.toLowerCase();

	if (name === 'NotAllowedError' || name === 'SecurityError') {
		return { kind: 'permission-denied', message: 'microphone permission is blocked', retryable: true };
	}
	if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
		return { kind: 'no-device', message: 'no audio input device found', retryable: true };
	}
	if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
		return { kind: 'device-busy', message: 'audio input is unavailable or already in use', retryable: true };
	}
	if (isConstraintError(error)) {
		return { kind: 'constraint', message: 'selected audio input is unavailable', retryable: true };
	}
	if (normalized.includes('not supported')) {
		return { kind: 'unsupported', message: 'audio input is not supported in this browser', retryable: false };
	}
	return { kind: 'unknown', message: 'could not start audio input', retryable: true };
}

function getRefreshStatus(
	currentStatus: string,
	permission: AudioInputPermission,
	deviceCount: number
): typeof INITIAL_AUDIO_INPUT_STATE.status {
	if (currentStatus === 'active' || currentStatus === 'requesting') return currentStatus;
	if (permission === 'denied') return 'permission-denied';
	if (deviceCount === 0) return 'no-device';
	return permission === 'prompt' ? 'needs-permission' : 'idle';
}

function getAudioErrorStatus(error: AudioInputErrorState): 'permission-denied' | 'no-device' | 'unavailable' | 'error' {
	if (error.kind === 'permission-denied') return 'permission-denied';
	if (error.kind === 'no-device') return 'no-device';
	return error.kind === 'unsupported' ? 'unavailable' : 'error';
}

async function queryAudioInputPermission(): Promise<AudioInputPermission> {
	const permissions = navigator.permissions;
	if (!permissions?.query) return 'unknown';

	try {
		const status = await permissions.query({ name: 'microphone' as PermissionName });
		if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') return status.state;
	} catch {
		// Some browsers expose Permissions but not the microphone descriptor.
	}
	return 'unknown';
}
