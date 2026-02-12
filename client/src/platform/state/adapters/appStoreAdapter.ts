import { useAppStore } from '../appStore';
import type { AppSettings, StatusState, CodeError } from '@/core/app.types';
import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import type { SlugSketchInfo } from '../slices/shareSlice';
import type { SharePayload } from '@/features/share/share.types';

/**
 * Adapter for accessing settings state.
 */
export interface SettingsAdapter {
    getSettings: () => AppSettings;
    setSettings: (settings: AppSettings) => void;
    getUiVisible: () => boolean;
}

/**
 * Adapter for accessing engine state.
 */
export interface EngineAdapter {
    getStatus: () => StatusState;
    setStatus: (status: StatusState) => void;
    getError: () => CodeError | null;
    setError: (error: CodeError | null) => void;
    getLastWorkingCode: (engineId: string) => string | null;
    setLastWorkingCode: (engineId: string, code: string | null) => void;
    getPendingWorkingCode: (engineId: string) => string | null;
    setPendingWorkingCode: (engineId: string, code: string) => void;
    cancelPendingWorkingCode: (engineId: string) => void;
    setCustomState: <T>(engineId: string, key: string, value: T) => void;
    setInitialized: (engineId: string, isInitialized: boolean) => void;
    initEngineState: (engineId: string) => void;
}

/**
 * Adapter for accessing share state.
 */
export interface ShareAdapter {
    getPayload: () => SharePayload | null;
    setPayload: (payload: SharePayload | null) => void;
    getConsented: () => boolean;
    setConsented: (consented: boolean) => void;
    getPromptOpen: () => boolean;
    setPromptOpen: (open: boolean) => void;
    clearOriginalApprovedSketch: () => void;
    getApprovedSketch: () => ApprovedSketch | null;
    setApprovedSketch: (sketch: ApprovedSketch | null) => void;
    setSlugSketchInfo: (info: SlugSketchInfo | null) => void;
}

/**
 * Adapter for accessing UI state.
 */
export interface UIAdapter {
    getIsMobile: () => boolean;
    getActivePanel: () => string;
    setActivePanel: (panel: string) => void;
}

/**
 * Unified application store adapter.
 * Provides access to Zustand store state for non-React classes.
 */
export interface AppStoreAdapter {
    settings: SettingsAdapter;
    engine: EngineAdapter;
    share: ShareAdapter;
    ui: UIAdapter;
}

/**
 * Create a unified store adapter.
 */
export const createAppStoreAdapter = (): AppStoreAdapter => {
    const getState = () => useAppStore.getState();

    return {
        settings: {
            getSettings: () => getState().settings,
            setSettings: (settings) => getState().setSettings(settings),
            getUiVisible: () => getState().settings.uiVisible,
        },
        engine: {
            getStatus: () => getState().status,
            setStatus: (status) => getState().setStatus(status),
            getError: () => getState().error,
            setError: (error) => getState().setError(error),
            getLastWorkingCode: (engineId) => getState().engineStates[engineId]?.lastWorkingCode ?? null,
            setLastWorkingCode: (engineId, code) => getState().setEngineLastWorkingCode(engineId, code),
            getPendingWorkingCode: (engineId) => getState().engineStates[engineId]?.pendingWorkingCode ?? null,
            setPendingWorkingCode: (engineId, code) => getState().setEnginePendingWorkingCode(engineId, code),
            cancelPendingWorkingCode: (engineId) => getState().cancelEnginePendingWorkingCode(engineId),
            setCustomState: (engineId, key, value) => getState().setEngineCustomState(engineId, key, value),
            setInitialized: (engineId, isInitialized) => getState().setEngineInitialized(engineId, isInitialized),
            initEngineState: (engineId) => getState().initEngineState(engineId),
        },
        share: {
            getPayload: () => getState().share.payload,
            setPayload: (payload) => getState().setSharePayload(payload),
            getConsented: () => getState().share.consented,
            setConsented: (consented) => getState().setShareConsented(consented),
            getPromptOpen: () => getState().share.promptOpen,
            setPromptOpen: (open) => getState().setSharePromptOpen(open),
            clearOriginalApprovedSketch: () => getState().clearOriginalApprovedSketch(),
            getApprovedSketch: () => getState().approvedSketch,
            setApprovedSketch: (sketch) => getState().setApprovedSketch(sketch),
            setSlugSketchInfo: (info) => getState().setSlugSketchInfo(info),
        },
        ui: {
            getIsMobile: () => getState().isMobile,
            getActivePanel: () => getState().activePanel,
            setActivePanel: (panel) => getState().setActivePanel(panel),
        },
    };
};
