import type { StateCreator } from 'zustand';
import { MOBILE_BREAKPOINT } from '@/core/app.types';
import type { AppState } from '../appStore';

export interface Pane {
    id: string;
    label: string;
}

export interface UISlice {
    isMobile: boolean;
    activePaneId: string;
    panes: Pane[];

    setIsMobile: (isMobile: boolean) => void;
    setActivePaneId: (paneId: string) => void;
    setPanes: (panes: Pane[]) => void;
}

export const createUISlice: StateCreator<
    AppState,
    [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
    [],
    UISlice
> = (set) => ({
    isMobile: typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false,
    activePaneId: '',
    panes: [],

    setIsMobile: (isMobile) => set({ isMobile }),
    setActivePaneId: (activePaneId) => set({ activePaneId }),
    setPanes: (panes) => set({ panes }),
});

/**
 * Initialize UI slice with window resize listener.
 */
export function initUISlice(getState: () => AppState): () => void {
    const handleResize = () => {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        const currentIsMobile = getState().isMobile;
        if (isMobile !== currentIsMobile) {
            getState().setIsMobile(isMobile);
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
}
