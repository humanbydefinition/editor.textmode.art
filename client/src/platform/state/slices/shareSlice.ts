import type { StateCreator } from 'zustand';
import type { SharePayload } from '@/types/share.types';
import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import type { AppState } from '../appStore';

export interface SlugSketchInfo {
    status: 'PENDING' | 'APPROVED';
    slug: string;
    title: string;
    description: string | null;
    authorName: string | null;
    license: string | null;
    socialLinks: Array<{ label: string; url: string }> | null;
}

export interface ShareSlice {
    share: {
        payload: SharePayload | null;
        consented: boolean;
        promptOpen: boolean;
    };
    approvedSketch: ApprovedSketch | null;
    slugSketchInfo: SlugSketchInfo | null;

    setSharePayload: (payload: SharePayload | null) => void;
    setShareConsented: (consented: boolean) => void;
    setSharePromptOpen: (open: boolean) => void;
    setApprovedSketch: (sketch: ApprovedSketch | null) => void;
    setSlugSketchInfo: (info: SlugSketchInfo | null) => void;
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
    setSlugSketchInfo: (info) => set({ slugSketchInfo: info }),
});
