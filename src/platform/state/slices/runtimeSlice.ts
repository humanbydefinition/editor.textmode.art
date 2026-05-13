import type { StateCreator } from 'zustand';
import type { CodeError, StatusState } from '@/types';
import type { AppState } from '../appStore';

export interface RuntimeSlice {
    error: CodeError | null;
    status: StatusState;

    /** Last known working code */
    lastWorkingCode: string | null;
    /** Pending working code (for confirmation delay) */
    pendingWorkingCode: string | null;
    /** Whether the engine is fully initialized */
    isInitialized: boolean;

    /** Runner connection state */
    runnerUnavailable: boolean;
    runnerReconnecting: boolean;
    runnerReady: boolean;

    randomizeLoading: boolean;

    setError: (error: CodeError | null) => void;
    clearError: () => void;
    setStatus: (status: StatusState) => void;
    setLastWorkingCode: (code: string | null) => void;
    setPendingWorkingCode: (code: string) => void;
    cancelPendingWorkingCode: () => void;
    setIsInitialized: (isInitialized: boolean) => void;
    setRunnerUnavailable: (value: boolean) => void;
    setRunnerReconnecting: (value: boolean) => void;
    setRunnerReady: (value: boolean) => void;
    setRandomizeLoading: (value: boolean) => void;
}

export const createRuntimeSlice: StateCreator<
    AppState,
    [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
    [],
    RuntimeSlice
> = (set) => ({
    error: null,
    status: 'ready',
    lastWorkingCode: null,
    pendingWorkingCode: null,
    isInitialized: false,
    runnerUnavailable: false,
    runnerReconnecting: false,
    runnerReady: false,
    randomizeLoading: false,

    setError: (error) => set({ error: error ? { ...error, source: error.source ?? 'textmode' } : null }),
    clearError: () => set({ error: null }),
    setStatus: (status) => set({ status }),
    setLastWorkingCode: (code) => set({ lastWorkingCode: code }),
    setPendingWorkingCode: (code) => set({ pendingWorkingCode: code }),
    cancelPendingWorkingCode: () => set({ pendingWorkingCode: null }),
    setIsInitialized: (isInitialized) => set({ isInitialized }),
    setRunnerUnavailable: (value) => set({ runnerUnavailable: value }),
    setRunnerReconnecting: (value) => set({ runnerReconnecting: value }),
    setRunnerReady: (value) => set({ runnerReady: value }),
    setRandomizeLoading: (value) => set({ randomizeLoading: value }),
});
