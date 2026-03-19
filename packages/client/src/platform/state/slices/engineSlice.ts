import type { StateCreator } from 'zustand';
import type { CodeError, StatusState } from '@/core/app.types';
import type { AppState } from '../appStore';

export interface EngineState {
    /** Last known working code for this engine */
    lastWorkingCode: string | null;

    /** Pending working code (for confirmation delay) */
    pendingWorkingCode: string | null;

    /** Custom state specific to the engine */
    customState: Record<string, unknown>;

    /** Whether the runtime/engine is fully initialized */
    isInitialized: boolean;
}

export interface EngineSlice {
    error: CodeError | null;
    engineErrors: Record<string, CodeError | null>;
    status: StatusState;
    engineStates: Record<string, EngineState>;

    setError: (error: CodeError | null) => void;
    setEngineError: (engineId: string, error: CodeError | null) => void;
    clearEngineError: (engineId: string) => void;
    setStatus: (status: StatusState) => void;
    initEngineState: (engineId: string) => void;
    setEngineLastWorkingCode: (engineId: string, code: string | null) => void;
    setEnginePendingWorkingCode: (engineId: string, code: string) => void;
    cancelEnginePendingWorkingCode: (engineId: string) => void;
    setEngineCustomState: <T>(engineId: string, key: string, value: T) => void;
    setEngineInitialized: (engineId: string, isInitialized: boolean) => void;
}

function createEngineState(): EngineState {
    return {
        lastWorkingCode: null,
        pendingWorkingCode: null,
        customState: {},
        isInitialized: false,
    };
}

export const createEngineSlice: StateCreator<
    AppState,
    [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
    [],
    EngineSlice
> = (set) => ({
    error: null,
    engineErrors: {},
    status: 'ready',
    engineStates: {},

    setError: (error) => {
        set((state) => {
            if (!error) {
                return { error: null, engineErrors: {} };
            }

            if (!error.source) {
                return { error };
            }

            return {
                error,
                engineErrors: {
                    ...state.engineErrors,
                    [error.source]: error,
                },
            };
        });
    },
    setEngineError: (engineId, error) => {
        set((state) => {
            const normalizedError = error ? { ...error, source: error.source ?? engineId } : null;
            const nextEngineErrors = {
                ...state.engineErrors,
                [engineId]: normalizedError,
            };

            const nextGlobalError = normalizedError ?? getFirstEngineError(nextEngineErrors);
            return {
                error: nextGlobalError,
                engineErrors: nextEngineErrors,
            };
        });
    },
    clearEngineError: (engineId) => {
        set((state) => {
            const nextEngineErrors = {
                ...state.engineErrors,
                [engineId]: null,
            };
            return {
                error: getFirstEngineError(nextEngineErrors),
                engineErrors: nextEngineErrors,
            };
        });
    },
    setStatus: (status) => set({ status }),

    initEngineState: (engineId) => {
        set((state) => {
            if (state.engineStates[engineId]) return state;
            return { engineStates: { ...state.engineStates, [engineId]: createEngineState() } };
        });
    },

    setEngineLastWorkingCode: (engineId, code) => {
        set((state) => {
            const pState = state.engineStates[engineId] || createEngineState();
            return { engineStates: { ...state.engineStates, [engineId]: { ...pState, lastWorkingCode: code } } };
        });
    },

    setEnginePendingWorkingCode: (engineId, code) => {
        set((state) => {
            const pState = state.engineStates[engineId] || createEngineState();
            return { engineStates: { ...state.engineStates, [engineId]: { ...pState, pendingWorkingCode: code } } };
        });
    },

    cancelEnginePendingWorkingCode: (engineId) => {
        set((state) => {
            const pState = state.engineStates[engineId];
            if (!pState) return state;
            return { engineStates: { ...state.engineStates, [engineId]: { ...pState, pendingWorkingCode: null } } };
        });
    },

    setEngineCustomState: (engineId, key, value) => {
        set((state) => {
            const pState = state.engineStates[engineId] || createEngineState();
            return {
                engineStates: {
                    ...state.engineStates,
                    [engineId]: { ...pState, customState: { ...pState.customState, [key]: value } },
                },
            };
        });
    },

    setEngineInitialized: (engineId, isInitialized) => {
        set((state) => {
            const pState = state.engineStates[engineId] || createEngineState();
            return { engineStates: { ...state.engineStates, [engineId]: { ...pState, isInitialized } } };
        });
    },
});

function getFirstEngineError(errors: Record<string, CodeError | null>): CodeError | null {
    for (const error of Object.values(errors)) {
        if (error) return error;
    }
    return null;
}
