import { useAppStore } from '@/platform/state/appStore';
import type { ControllerStoreAdapter } from '@/core/BaseController';

/**
 * Store adapter - thin facade over the Zustand store.
 * Injected into controllers so they never import the store directly.
 */
/**
 * Creates a ControllerStoreAdapter backed by the global Zustand store.
 * Inject this into controller dependencies so controllers never import the store directly.
 */
export function createControllerStoreAdapter(): ControllerStoreAdapter {
    return {
        // Error / status
        setError: (error) => useAppStore.getState().setError(error),
        clearError: () => useAppStore.getState().clearError(),
        setStatus: (status) => useAppStore.getState().setStatus(status),

        // Engine state
        getLastWorkingCode: () => useAppStore.getState().lastWorkingCode,
        setLastWorkingCode: (code) => useAppStore.getState().setLastWorkingCode(code),
        getPendingWorkingCode: () => useAppStore.getState().pendingWorkingCode,
        setPendingWorkingCode: (code) => useAppStore.getState().setPendingWorkingCode(code),
        cancelPendingWorkingCode: () => useAppStore.getState().cancelPendingWorkingCode(),
        setIsInitialized: (initialized) => useAppStore.getState().setIsInitialized(initialized),

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
