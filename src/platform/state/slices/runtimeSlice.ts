import type { StateCreator } from 'zustand';
import type { CodeError } from '@/types';
import type { AppState } from '../appStore';

export type RunnerStatus = 'connected' | 'unavailable' | 'reconnecting';

export interface RuntimeSlice {
	error: CodeError | null;
	lastWorkingCode: string | null;
	runnerStatus: RunnerStatus;

	setError: (error: CodeError | null) => void;
	clearError: () => void;
	setLastWorkingCode: (code: string | null) => void;
	setRunnerStatus: (status: RunnerStatus) => void;
}

export const createRuntimeSlice: StateCreator<
	AppState,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
	[],
	RuntimeSlice
> = (set) => ({
	error: null,
	lastWorkingCode: null,
	runnerStatus: 'connected',

	setError: (error) => set({ error }),
	clearError: () => set({ error: null }),
	setLastWorkingCode: (code) => set({ lastWorkingCode: code }),
	setRunnerStatus: (runnerStatus) => set({ runnerStatus }),
});
