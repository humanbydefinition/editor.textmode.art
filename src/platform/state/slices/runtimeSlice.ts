import type { StateCreator } from 'zustand';
import type { CodeError } from '@/types';
import type { AppState } from '../appStore';

export interface RuntimeSlice {
	error: CodeError | null;
	lastWorkingCode: string | null;
	runnerUnavailable: boolean;
	runnerReconnecting: boolean;

	setError: (error: CodeError | null) => void;
	clearError: () => void;
	setLastWorkingCode: (code: string | null) => void;
	setRunnerUnavailable: (value: boolean) => void;
	setRunnerReconnecting: (value: boolean) => void;
}

export const createRuntimeSlice: StateCreator<
	AppState,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
	[],
	RuntimeSlice
> = (set) => ({
	error: null,
	lastWorkingCode: null,
	runnerUnavailable: false,
	runnerReconnecting: false,

	setError: (error) => set({ error: error ? { ...error, source: error.source ?? 'textmode' } : null }),
	clearError: () => set({ error: null }),
	setLastWorkingCode: (code) => set({ lastWorkingCode: code }),
	setRunnerUnavailable: (value) => set({ runnerUnavailable: value }),
	setRunnerReconnecting: (value) => set({ runnerReconnecting: value }),
});
