import { useState, type RefObject } from 'react';
import { AppLayout } from './EditorLayout';
import { SystemMenu } from './SystemMenu/SystemMenu';
import { ErrorOverlay } from './ErrorOverlay';
import { WelcomeDialog } from './WelcomeDialog';
import { MouseSonar, type MouseSonarHandle } from './MouseSonar';
import { cn } from '@/utils/utils';
import type { PaneConfig } from './EditorLayout/types';
import { useAppStore } from '@/stores/appStore';
import { Columns2, Rows2 } from 'lucide-react';
import { MobileNav } from './EditorLayout/MobileNav';
import { ShareConsentDialog } from './ShareConsentDialog';


export interface AppShellProps {
    /** Pane configurations for the layout */
    panes: PaneConfig[];
    /** Whether to show editor backdrop */
    editorBackdrop: boolean;
    /** Callback when a pane container is ready */
    onPaneReady: (paneId: string, container: HTMLElement) => void;
    /** Ref for the mouse sonar */
    sonarRef: RefObject<MouseSonarHandle | null>;

    // Actions (Controller Logic)
    onShare: () => void;
    onClearStorage: () => void;
    onLoadExample: (code: string, engineId: string) => void;
    onRevertToLastWorking: () => void;
    onShareUnlockAndRun: () => void;
    onShareUnlockOnly: () => void;
    onShareDiscard: () => void;
}

/**
 * Root component for the application.
 * Renders both EditorLayout (editor panes) and the AppShell (UI layer).
 */
export function AppShell({
    panes,
    editorBackdrop,
    onPaneReady,
    sonarRef,
    onShare,
    onClearStorage,
    onLoadExample,
    onRevertToLastWorking,
    onShareUnlockAndRun,
    onShareUnlockOnly,
    onShareDiscard,
}: AppShellProps) {
    const [welcomeOpen, setWelcomeOpen] = useState(true);

    // Store State
    const error = useAppStore((state) => state.error);
    const setError = useAppStore((state) => state.setError);
    const isMobile = useAppStore((state) => state.isMobile);
    const editorOrientation = useAppStore((state) => state.editorOrientation);
    const setEditorOrientation = useAppStore((state) => state.setEditorOrientation);

    // Derived state (could be moved to store selector)
    const hasLastWorking = useAppStore((state) => {
        if (!state.error?.source) return false;
        const pState = state.engineStates.get(state.error.source);
        return pState?.lastWorkingCode !== null && pState?.lastWorkingCode !== undefined;
    });

    const onDismissError = () => setError(null);

    const isHorizontal = editorOrientation === 'horizontal';
    const toggleOrientation = () => {
        setEditorOrientation(isHorizontal ? 'vertical' : 'horizontal');
    };

    return (
        <>
            {/* Layout layer - editor panes with mobile nav */}
            <AppLayout
                panes={panes}
                editorBackdrop={editorBackdrop}
                onPaneReady={onPaneReady}
            />

            {/* UI shell layer - elevated above editors */}
            <div
                id="shell-container"
                className="fixed inset-0 z-[100] pointer-events-none"
            >
                {/* Orientation Toggle Button (Desktop Only) */}
                {!isMobile && (
                    <div className="fixed top-2 left-2 z-50 pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={toggleOrientation}
                            className={cn(
                                'flex items-center justify-center',
                                'w-8 h-8 rounded-md', // Matching generic button size roughly, or make it like system menu
                                'bg-neutral-800/40 backdrop-blur-md',
                                'border border-white/5',
                                'text-neutral-400',
                                'transition-all duration-300',
                                'hover:scale-105 hover:bg-neutral-800/60 hover:text-white',
                                'focus:outline-none focus:ring-2 focus:ring-white/10'
                            )}
                            title={`switch to ${isHorizontal ? 'vertical' : 'horizontal'} layout`}
                        >
                            {isHorizontal ? <Rows2 size={16} /> : <Columns2 size={16} />}
                        </button>
                    </div>
                )}

                {/* Mobile Navigation */}
                <MobileNav />

                <WelcomeDialog onOpenChange={setWelcomeOpen} />

                {!welcomeOpen && (
                    <ShareConsentDialog
                        onUnlockAndRun={onShareUnlockAndRun}
                        onUnlockOnly={onShareUnlockOnly}
                        onDiscard={onShareDiscard}
                    />
                )}

                {/* Mouse Sonar - always rendered for cursor finding */}
                <MouseSonar ref={sonarRef} />

                {/* Main UI - hidden when welcome modal is open, with smooth transition */}
                <div
                    className={cn(
                        "transition-opacity duration-500 ease-out pointer-events-none",
                        welcomeOpen ? "opacity-0" : "opacity-100"
                    )}
                >
                    <SystemMenu
                        onShare={onShare}
                        onClearStorage={onClearStorage}
                        onLoadExample={onLoadExample}
                    />

                    <ErrorOverlay
                        error={error}
                        hasLastWorking={hasLastWorking}
                        onDismiss={onDismissError}
                        onRevert={onRevertToLastWorking}
                    />
                </div>
            </div>
        </>
    );
}
