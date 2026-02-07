import type { StateCreator } from 'zustand';
import type { SharePayload } from '@/types/share.types';
import type { ApprovedSketch } from '@/services/SketchApiService';
import type { AppState } from '../appStore';

export interface ShareSlice {
    share: {
        payload: SharePayload | null;
        consented: boolean;
        promptOpen: boolean;
    };
    approvedSketch: ApprovedSketch | null;

    setSharePayload: (payload: SharePayload | null) => void;
    setShareConsented: (consented: boolean) => void;
    setSharePromptOpen: (open: boolean) => void;
    setApprovedSketch: (sketch: ApprovedSketch | null) => void;
}

export const createShareSlice: StateCreator<
    AppState,
    [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
    [],
    ShareSlice
> = (set) => ({
    share: {
        payload: null,
        consented: false,
        promptOpen: false,
    },
    approvedSketch: null,

    setSharePayload: (payload) => set({
        share: {
            payload,
            consented: false,
            promptOpen: Boolean(payload),
        },
    }),
    setShareConsented: (consented) => set((state) => ({
        share: {
            ...state.share,
            consented,
            promptOpen: consented ? false : state.share.promptOpen,
        },
    })),
    setSharePromptOpen: (open) => set((state) => ({
        share: {
            ...state.share,
            promptOpen: open && Boolean(state.share.payload),
        },
    })),
    setApprovedSketch: (sketch) => set({ approvedSketch: sketch }),
});
