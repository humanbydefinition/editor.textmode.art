import { createContext, useContext } from 'react';
import type { PaneConfig } from '@/features/editor-layout';
import type { StrudelTransportState } from '@/core/app.types';
import type { ShareExportData } from '@/features/share';

/**
 * Context value provided by AppRuntime to the React tree.
 * Replaces the massive props list formerly passed to AppShell.
 */
export interface AppRuntimeContextValue {
    actions: {
        // Core
        share: () => void;
        randomize: () => Promise<boolean>;
        toggleStrudelTransport: () => void;
        makeRandomChange: () => void;
        clearStorage: () => void;
        loadExample: (code: string, engineId: string) => void;
        revertToLastWorking: () => void;
        reconnectTextmodeRunner: () => void;

        // Share / Export
        unlockAndRun: () => void;
        unlockOnly: () => void;
        discardShare: () => void;
        openSharePrompt: () => void;

        copyShareExportUrl: (url: string) => void;

        getShareExportData: () => ShareExportData;
    };

    state: {
        strudelEnabled: boolean;
        strudelTransport: StrudelTransportState;
        randomizeLoading: boolean;
        editorBackdrop: boolean;
    };

    layout: {
        panes: PaneConfig[];
        onPaneReady: (paneId: string, container: HTMLElement) => void;
    };
}

const AppRuntimeContext = createContext<AppRuntimeContextValue | null>(null);

export function useAppRuntime(): AppRuntimeContextValue {
    const context = useContext(AppRuntimeContext);
    if (!context) {
        throw new Error('useAppRuntime must be used within an AppRuntimeContext.Provider');
    }
    return context;
}

export const AppRuntimeProvider = AppRuntimeContext.Provider;
