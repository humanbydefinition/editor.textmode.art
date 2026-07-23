import type { StateCreator } from 'zustand';
import type { AudioInputDevice } from '@/platform/audio/AudioInputService';
import type { AppState } from '../appStore';

export type AudioInputStatus =
	| 'idle'
	| 'checking'
	| 'needs-permission'
	| 'requesting'
	| 'active'
	| 'no-device'
	| 'permission-denied'
	| 'unavailable'
	| 'error';

export type AudioInputPermission = 'unknown' | 'prompt' | 'granted' | 'denied';

export type AudioInputErrorKind =
	'unsupported' | 'permission-denied' | 'no-device' | 'device-busy' | 'constraint' | 'unknown';

export interface AudioInputErrorState {
	kind: AudioInputErrorKind;
	message: string;
	retryable: boolean;
}

export interface AudioInputState {
	status: AudioInputStatus;
	permission: AudioInputPermission;
	isRefreshingDevices: boolean;
	devices: AudioInputDevice[];
	selectedDeviceId: string;
	level: number;
	error: AudioInputErrorState | null;
}

export interface AudioSlice {
	audioInput: AudioInputState;
	setAudioInput: (state: Partial<AudioInputState>) => void;
}

export const createAudioSlice: StateCreator<
	AppState,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
	[],
	AudioSlice
> = (set) => ({
	audioInput: {
		status: 'idle',
		permission: 'unknown',
		isRefreshingDevices: false,
		devices: [],
		selectedDeviceId: '',
		level: 0,
		error: null,
	},
	setAudioInput: (state) =>
		set((current) => ({
			audioInput: {
				...current.audioInput,
				...state,
			},
		})),
});
