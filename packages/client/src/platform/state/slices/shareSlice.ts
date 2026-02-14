import type { StateCreator } from 'zustand';
import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import type { SharePayload } from '@synth.textmode.art/contracts/share';
import type { AppState } from '../appStore';
import type { SlugSketchInfo } from '@/shared/types/slugSketchInfo';

export interface ShareSlice {
    share: {
        payload: SharePayload | null;
        consented: boolean;
        promptOpen: boolean;
    };
    approvedSketch: ApprovedSketch | null;
    slugSketchInfo: SlugSketchInfo | null;

    /**
     * Shadow copy of the approved sketch. Preserved when the user edits code
     * so that reverting to the original code can restore the active reference.
     */
    originalApprovedSketch: ApprovedSketch | null;
    originalSlugSketchInfo: SlugSketchInfo | null;

    setSharePayload: (payload: SharePayload | null) => void;
    setShareConsented: (consented: boolean) => void;
    setSharePromptOpen: (open: boolean) => void;
    setApprovedSketch: (sketch: ApprovedSketch | null) => void;
    setSlugSketchInfo: (info: SlugSketchInfo | null) => void;
    clearOriginalApprovedSketch: () => void;
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
    slugSketchInfo: null,
    originalApprovedSketch: null,
    originalSlugSketchInfo: null,

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
    setApprovedSketch: (sketch) => set(() => {
        // When setting a non-null sketch, also save it as the original reference
        if (sketch) {
            return {
                approvedSketch: sketch,
                originalApprovedSketch: sketch,
            };
        }
        // When clearing, only clear the active reference; keep the original
        return { approvedSketch: null };
    }),
    setSlugSketchInfo: (info) => set(() => {
        if (info) {
            return {
                slugSketchInfo: info,
                originalSlugSketchInfo: info,
            };
        }
        return { slugSketchInfo: null };
    }),
    clearOriginalApprovedSketch: () => set({
        originalApprovedSketch: null,
        originalSlugSketchInfo: null,
        approvedSketch: null,
        slugSketchInfo: null,
    }),
});
