import { useState } from 'react';
import { AppLayout } from './EditorLayout';
import { SystemMenu } from './SystemMenu/SystemMenu';
import { ErrorOverlay } from './ErrorOverlay';
import { WelcomeDialog } from './dialogs/WelcomeDialog';
import { cn } from '@/utils/utils';
import type { PaneConfig } from './EditorLayout/types';
import { useAppStore } from '@/stores/appStore';
import { MobileNav } from './EditorLayout/MobileNav';
import { ShareConsentDialog } from './dialogs/ShareConsentDialog';
import { ShareExportDialog, type ShareExportData } from './dialogs/ShareExportDialog';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SlugInfoAlert } from './SlugInfoAlert';


export interface AppShellProps {
    /** Pane configurations for the layout */
    panes: PaneConfig[];
    /** Whether to show editor backdrop */
    editorBackdrop: boolean;
    /** Callback when a pane container is ready */
    onPaneReady: (paneId: string, container: HTMLElement) => void;
    // Actions (Controller Logic)
    onShare: () => void;
    onRandomize: () => void;
    randomizeLoading: boolean;
    onClearStorage: () => void;
    onLoadExample: (code: string, engineId: string) => void;
    onRevertToLastWorking: () => void;
    onShareUnlockAndRun: () => void;
    onShareUnlockOnly: () => void;
    onShareDiscard: () => void;
    onSharePromptOpen: () => void;
    shareExportOpen: boolean;
    shareExportData: ShareExportData | null;
    onShareExportOpenChange: (open: boolean) => void;
    onShareExportCopy: (url: string) => void;
    showSafariActivationPrompt: boolean;
    onSafariActivation: () => void;
}

/**
 * Root component for the application.
 * Renders both EditorLayout (editor panes) and the AppShell (UI layer).
 */
export function AppShell({
    panes,
    editorBackdrop,
    onPaneReady,
    onShare,
    onRandomize,
    randomizeLoading,
    onClearStorage,
    onLoadExample,
    onRevertToLastWorking,
    onShareUnlockAndRun,
    onShareUnlockOnly,
    onShareDiscard,
    onSharePromptOpen,
    shareExportOpen,
    shareExportData,
    onShareExportOpenChange,
    onShareExportCopy,
    showSafariActivationPrompt,
    onSafariActivation,
}: AppShellProps) {
    const [welcomeOpen, setWelcomeOpen] = useState(true);

    // Store State
    const error = useAppStore((state) => state.error);
    const setError = useAppStore((state) => state.setError);
    const share = useAppStore((state) => state.share);
    const showShareLock = Boolean(share.payload && !share.consented && !share.promptOpen);

    // Derived state (could be moved to store selector)
    const hasLastWorking = useAppStore((state) => {
        if (!state.error?.source) return false;
        const pState = state.engineStates.get(state.error.source);
        return pState?.lastWorkingCode !== null && pState?.lastWorkingCode !== undefined;
    });


    const onDismissError = () => setError(null);

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
                {/* Orientation Toggle Button (Desktop Only) removed */}

                {/* Mobile Navigation */}
                <MobileNav />

                <WelcomeDialog onOpenChange={setWelcomeOpen} />

                <SlugInfoAlert />

                {!welcomeOpen && (
                    <ShareConsentDialog
                        onUnlockAndRun={onShareUnlockAndRun}
                        onUnlockOnly={onShareUnlockOnly}
                        onDiscard={onShareDiscard}
                    />
                )}

                <ShareExportDialog
                    open={shareExportOpen}
                    data={shareExportData}
                    onOpenChange={onShareExportOpenChange}
                    onCopyLink={onShareExportCopy}
                />

                {showShareLock && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={onSharePromptOpen}
                                className={cn(
                                    'fixed bottom-2 right-2 z-50 pointer-events-auto',
                                    'flex items-center justify-center',
                                    'w-6 h-6 rounded-full',
                                    'bg-amber-500/15 backdrop-blur-md',
                                    'border border-amber-500/30',
                                    'text-amber-200',
                                    'transition-all duration-200',
                                    'hover:scale-105 hover:bg-amber-500/25',
                                    'focus:outline-none focus:ring-2 focus:ring-amber-400/30'
                                )}
                                aria-label="Sketch locked (click to unlock)"
                            >
                                <Lock className="w-[14px] h-[14px]" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>sketch locked — click to unlock</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {!welcomeOpen && showSafariActivationPrompt && (
                    <div
                        className={cn(
                            'fixed bottom-2 left-1/2 -translate-x-1/2 z-50 pointer-events-auto',
                            'flex items-center gap-2',
                            'rounded-md border border-zinc-700/70 bg-zinc-950/85 px-2 py-1.5 backdrop-blur-sm'
                        )}
                    >
                        <span className="text-[11px] text-zinc-200">
                            Safari may cap visuals at 30 FPS.
                        </span>
                        <button
                            onClick={onSafariActivation}
                            className={cn(
                                'rounded-sm border border-emerald-500/50 px-2 py-0.5 text-[11px] text-emerald-200',
                                'hover:bg-emerald-500/20',
                                'focus:outline-none focus:ring-2 focus:ring-emerald-400/30'
                            )}
                        >
                            unlock canvas
                        </button>
                    </div>
                )}

                {/* Main UI - hidden when welcome modal is open, with smooth transition */}
                <div
                    className={cn(
                        "transition-opacity duration-500 ease-out pointer-events-none",
                        welcomeOpen ? "opacity-0" : "opacity-100"
                    )}
                >
                    {!showShareLock && (
                        <SystemMenu
                            onShare={onShare}
                            onRandomize={onRandomize}
                            randomizeLoading={randomizeLoading}
                            onClearStorage={onClearStorage}
                            onLoadExample={onLoadExample}
                        />
                    )}

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
