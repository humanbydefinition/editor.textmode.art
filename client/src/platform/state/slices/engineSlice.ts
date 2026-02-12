import type { StateCreator } from 'zustand';
import type { CodeError, StatusState } from '@/core/app.types';
import type { AppState } from '../appStore';

export interface EngineState {
    /** Last known working code for this engine */
    lastWorkingCode: string | null;

    /** Pending working code (for confirmation delay) */
    pendingWorkingCode: string | null;

    /** Custom state specific to the engine (e.g., StrudelState) */
    customState: Record<string, unknown>;

    /** Whether the runtime/engine is fully initialized */
    isInitialized: boolean;
}

export interface EngineSlice {
    error: CodeError | null;
    status: StatusState;
    engineStates: Record<string, EngineState>;

    setError: (error: CodeError | null) => void;
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
    status: 'ready',
    engineStates: {},

    setError: (error) => set({ error }),
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
