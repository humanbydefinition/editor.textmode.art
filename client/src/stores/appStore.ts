import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
    DEFAULT_SETTINGS,
    type AppSettings,
    type CodeError,
    type StatusState
} from '@/types/app.types';
import type { ApprovedSketch } from '@/services/SketchApiService';
import type { SharePayload } from '@/types/share.types';

const MOBILE_BREAKPOINT = 768;
const CONFIRMATION_DELAY_MS = 100;

export interface Panel {
    id: string;
    label: string;
}

export interface EngineState {
    /** Last known working code for this engine */
    lastWorkingCode: string | null;

    /** Pending working code (for confirmation delay) */
    pendingWorkingCode: string | null;

    /** Confirmation timer ID */
    confirmationTimer: number | null;

    /** Custom state specific to the engine (e.g., StrudelState) */
    customState: Record<string, unknown>;

    /** Whether the runtime/engine is fully initialized */
    isInitialized: boolean;
}


export interface AppState {
    // --- App Data State ---
    settings: AppSettings;
    error: CodeError | null;
    status: StatusState;
    engineStates: Map<string, EngineState>;
    share: {
        payload: SharePayload | null;
        consented: boolean;
        promptOpen: boolean;
    };
    approvedSketch: ApprovedSketch | null;

    // --- UI/Layout State ---
    isMobile: boolean;
    activePanel: string;
    panels: Panel[];

    // --- Actions ---
    setSettings: (settings: AppSettings) => void;
    setError: (error: CodeError | null) => void;
    setStatus: (status: StatusState) => void;
    setSharePayload: (payload: SharePayload | null) => void;
    setShareConsented: (consented: boolean) => void;
    setSharePromptOpen: (open: boolean) => void;
    setApprovedSketch: (sketch: ApprovedSketch | null) => void;

    // Plugin State Actions
    initEngineState: (engineId: string) => void;
    setEngineLastWorkingCode: (engineId: string, code: string | null) => void;
    setEnginePendingWorkingCode: (engineId: string, code: string) => void;
    cancelEnginePendingWorkingCode: (engineId: string) => void;
    setEngineCustomState: <T>(engineId: string, key: string, value: T) => void;
    setEngineInitialized: (engineId: string, isInitialized: boolean) => void;

    // UI Actions
    setIsMobile: (isMobile: boolean) => void;
    setActivePanel: (panel: string) => void;
    setPanels: (panels: Panel[]) => void;
}

// Helper to create initial engine state
function createEngineState(): EngineState {
    return {
        lastWorkingCode: null,
        pendingWorkingCode: null,
        confirmationTimer: null,
        customState: {},
        isInitialized: false,
    };
}


/**
 * Centralized Zustand state for the application.
 * Manages configuration, errors, status, engine states, and UI layout.
 */

export const useAppStore = create<AppState>()(subscribeWithSelector((set, get) => ({
    // Initial State
    settings: DEFAULT_SETTINGS,
    error: null,
    status: 'ready',
    engineStates: new Map(),
    share: {
        payload: null,
        consented: false,
        promptOpen: false,
    },
    approvedSketch: null,

    isMobile: typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false,
    activePanel: '',
    panels: [],

    // Actions
    setSettings: (settings) => set({ settings }),
    setError: (error) => set({ error }),
    setStatus: (status) => set({ status }),
    setSharePayload: (payload) => set({
        share: {
            payload,
            consented: false,
            promptOpen: Boolean(payload),
        }
    }),
    setShareConsented: (consented) => set((state) => ({
        share: {
            ...state.share,
            consented,
            promptOpen: consented ? false : state.share.promptOpen,
        }
    })),
    setSharePromptOpen: (open) => set((state) => ({
        share: {
            ...state.share,
            promptOpen: open && Boolean(state.share.payload),
        }
    })),
    setApprovedSketch: (sketch) => set({ approvedSketch: sketch }),

    initEngineState: (engineId) => {
        set((state) => {
            if (state.engineStates.has(engineId)) return state;
            const newStates = new Map(state.engineStates);
            newStates.set(engineId, createEngineState());
            return { engineStates: newStates };
        });
    },

    setEngineLastWorkingCode: (engineId, code) => {
        set((state) => {
            const newStates = new Map(state.engineStates);
            const pState = newStates.get(engineId) || createEngineState();
            newStates.set(engineId, { ...pState, lastWorkingCode: code });
            return { engineStates: newStates };
        });
    },

    setEnginePendingWorkingCode: (engineId, code) => {
        const state = get();
        const pState = state.engineStates.get(engineId);

        // Clear existing timer if any
        if (pState?.confirmationTimer) {
            clearTimeout(pState.confirmationTimer);
        }

        // Set timer
        const timer = setTimeout(() => {
            const currentState = get();
            const currentPState = currentState.engineStates.get(engineId);
            if (currentPState?.pendingWorkingCode) {
                // Commit pending to last working
                get().setEngineLastWorkingCode(engineId, currentPState.pendingWorkingCode);
                // Clear pending
                set((s) => {
                    const ns = new Map(s.engineStates);
                    const ps = ns.get(engineId);
                    if (ps) ns.set(engineId, { ...ps, pendingWorkingCode: null, confirmationTimer: null });
                    return { engineStates: ns };
                });
            }
        }, CONFIRMATION_DELAY_MS) as unknown as number;

        // Update state with pending code and timer
        set((s) => {
            const ns = new Map(s.engineStates);
            const ps = ns.get(engineId) || createEngineState();
            ns.set(engineId, { ...ps, pendingWorkingCode: code, confirmationTimer: timer });
            return { engineStates: ns };
        });
    },

    cancelEnginePendingWorkingCode: (engineId) => {
        set((state) => {
            const newStates = new Map(state.engineStates);
            const pState = newStates.get(engineId);
            if (pState) {
                if (pState.confirmationTimer) clearTimeout(pState.confirmationTimer);
                newStates.set(engineId, { ...pState, pendingWorkingCode: null, confirmationTimer: null });
            }
            return { engineStates: newStates };
        });
    },

    setEngineCustomState: (engineId, key, value) => {
        set((state) => {
            const newStates = new Map(state.engineStates);
            const pState = newStates.get(engineId) || createEngineState();
            newStates.set(engineId, {
                ...pState,
                customState: { ...pState.customState, [key]: value }
            });
            return { engineStates: newStates };
        });
    },

    setEngineInitialized: (engineId, isInitialized) => {
        set((state) => {
            const newStates = new Map(state.engineStates);
            const pState = newStates.get(engineId) || createEngineState();
            newStates.set(engineId, { ...pState, isInitialized });
            return { engineStates: newStates };
        });
    },


    setIsMobile: (isMobile) => set({ isMobile }),
    setActivePanel: (activePanel) => set({ activePanel }),
    setPanels: (panels) => set({ panels }),
})));

/**
 * Initialize app store with window resize listener.
 */
export function initAppStore(): () => void {
    const handleResize = () => {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        const currentIsMobile = useAppStore.getState().isMobile;
        if (isMobile !== currentIsMobile) {
            useAppStore.getState().setIsMobile(isMobile);
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
}
