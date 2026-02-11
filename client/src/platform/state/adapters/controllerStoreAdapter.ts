import { useAppStore } from '@/platform/state/appStore';
import type { CodeError, StatusState } from '@/types/app.types';
import type { EngineState } from '@/platform/state/appStore';
import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import type { SlugSketchInfo } from '@/platform/state/slices/shareSlice';

/**
 * Store adapter - thin facade over the Zustand store.
 * Injected into controllers so they never import the store directly.
 */
export interface ControllerStoreAdapter {
    // Error / status
    setError: (error: CodeError | null) => void;
    setStatus: (status: StatusState) => void;

    // Engine state
    getEngineState: (engineId: string) => EngineState | undefined;
    setEngineLastWorkingCode: (engineId: string, code: string | null) => void;
    setEnginePendingWorkingCode: (engineId: string, code: string) => void;
    cancelEnginePendingWorkingCode: (engineId: string) => void;
    setEngineInitialized: (engineId: string, initialized: boolean) => void;
    setEngineCustomState: <T>(engineId: string, key: string, value: T) => void;

    // Share
    getShareState: () => { payload: unknown | null; consented: boolean; promptOpen: boolean };
    setSharePromptOpen: (open: boolean) => void;

    // Approved sketch
    getApprovedSketch: () => ApprovedSketch | null;
    setApprovedSketch: (sketch: ApprovedSketch | null) => void;
    getSlugSketchInfo: () => SlugSketchInfo | null;
    setSlugSketchInfo: (info: SlugSketchInfo | null) => void;
    getOriginalApprovedSketch: () => ApprovedSketch | null;
    getOriginalSlugSketchInfo: () => SlugSketchInfo | null;
}

/**
 * Creates a ControllerStoreAdapter backed by the global Zustand store.
 * Inject this into controller dependencies so controllers never import the store directly.
 */
export function createControllerStoreAdapter(): ControllerStoreAdapter {
    return {
        // Error / status
        setError: (error) => useAppStore.getState().setError(error),
        setStatus: (status) => useAppStore.getState().setStatus(status),

        // Engine state
        getEngineState: (engineId) => useAppStore.getState().engineStates[engineId],
        setEngineLastWorkingCode: (engineId, code) => useAppStore.getState().setEngineLastWorkingCode(engineId, code),
        setEnginePendingWorkingCode: (engineId, code) => useAppStore.getState().setEnginePendingWorkingCode(engineId, code),
        cancelEnginePendingWorkingCode: (engineId) => useAppStore.getState().cancelEnginePendingWorkingCode(engineId),
        setEngineInitialized: (engineId, initialized) => useAppStore.getState().setEngineInitialized(engineId, initialized),
        setEngineCustomState: (engineId, key, value) => useAppStore.getState().setEngineCustomState(engineId, key, value),

        // Share
        getShareState: () => useAppStore.getState().share,
        setSharePromptOpen: (open) => useAppStore.getState().setSharePromptOpen(open),

        // Approved sketch
        getApprovedSketch: () => useAppStore.getState().approvedSketch,
        setApprovedSketch: (sketch) => useAppStore.getState().setApprovedSketch(sketch),
        getSlugSketchInfo: () => useAppStore.getState().slugSketchInfo,
        setSlugSketchInfo: (info) => useAppStore.getState().setSlugSketchInfo(info),
        getOriginalApprovedSketch: () => useAppStore.getState().originalApprovedSketch,
        getOriginalSlugSketchInfo: () => useAppStore.getState().originalSlugSketchInfo,
    };
}
