/**
 * Layout type definitions.
 * Types for the extensible pane-based layout system.
 */
import { MOBILE_BREAKPOINT } from '@/core/app.types';

/**
 * Direction for split panes.
 */
export type SplitDirection = 'horizontal' | 'vertical';

/**
 * Props for a pane in the layout.
 */
export interface PaneConfig {
    /** Unique pane identifier */
    id: string;
    /** Engine ID to render in this pane */
    engineId: string;
}

/**
 * Layout state for mobile mode.
 */
export interface MobileLayoutState {
    /** Active tab/pane ID */
    activePaneId: string;
}

/**
 * Layout state for desktop mode.
 */
export interface DesktopLayoutState {
    /** Split ratio (0-1) */
    splitRatio: number;
    /** Split direction */
    direction: SplitDirection;
}

/**
 * Combined layout state.
 */
export interface LayoutState {
    /** Whether in mobile mode */
    isMobile: boolean;
    /** Desktop-specific state */
    desktop: DesktopLayoutState;
    /** Mobile-specific state */
    mobile: MobileLayoutState;
    /** Pane configurations */
    panes: PaneConfig[];
}

/**
 * Layout context value.
 */
export interface LayoutContextValue {
    /** Current layout state */
    state: LayoutState;
    /** Set the active pane (for mobile tabs) */
    setActivePane: (paneId: string) => void;
    /** Set split ratio */
    setSplitRatio: (ratio: number) => void;
    /** Register a pane container ref */
    registerPaneRef: (paneId: string, ref: HTMLElement | null) => void;
    /** Get container for a pane */
    getPaneContainer: (paneId: string) => HTMLElement | null;
}

/**
 * Default layout state.
 */
export const DEFAULT_LAYOUT_STATE: LayoutState = {
    isMobile: typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false,
    desktop: {
        splitRatio: 0.5,
        direction: 'horizontal',
    },
    mobile: {
        activePaneId: '',
    },
    panes: [],
};
