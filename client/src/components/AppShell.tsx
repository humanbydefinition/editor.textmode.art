import { useState } from 'react';
import { AppLayout } from './EditorLayout';
import { SystemMenu } from '@/features/system-menu';
import { ErrorOverlay } from './ErrorOverlay';
import { WelcomeDialog } from './WelcomeDialog';
import { cn } from '@/shared/lib/cn';
import type { PaneConfig } from './EditorLayout/types';
import { useAppStore } from '@/platform/state/appStore';
import {
    selectError,
    selectHasLastWorkingForError,
    selectShareState,
    selectTextmodeRunnerReconnecting,
    selectTextmodeRunnerUnavailable,
} from '@/platform/state/selectors';
import { MobileNav } from './EditorLayout/MobileNav';
import { ShareConsentDialog, ShareExportDialog, type ShareExportData } from '@/features/share';
import { Lock, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { Button } from '@/shared/ui/button';
import type { StrudelTransportState } from '@/types/app.types';


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
    onToggleStrudelTransport: () => void;
    onMakeRandomChange: () => void;
    strudelEnabled: boolean;
    strudelTransport: StrudelTransportState;
    randomizeLoading: boolean;
    onClearStorage: () => void;
    onLoadExample: (code: string, engineId: string) => void;
    onRevertToLastWorking: () => void;
    onShareUnlockAndRun: () => void;
    onShareUnlockOnly: () => void;
    onShareDiscard: () => void;
    onSharePromptOpen: () => void;
    onReconnectTextmodeRunner: () => void;
    shareExportOpen: boolean;
    shareExportData: ShareExportData | null;
    onShareExportOpenChange: (open: boolean) => void;
    onShareExportCopy: (url: string) => void;
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
    onToggleStrudelTransport,
    onMakeRandomChange,
    strudelEnabled,
    strudelTransport,
    randomizeLoading,
    onClearStorage,
    onLoadExample,
    onRevertToLastWorking,
    onShareUnlockAndRun,
    onShareUnlockOnly,
    onShareDiscard,
    onSharePromptOpen,
    onReconnectTextmodeRunner,
    shareExportOpen,
    shareExportData,
    onShareExportOpenChange,
    onShareExportCopy,
}: AppShellProps) {
    const [welcomeOpen, setWelcomeOpen] = useState(true);

    // Store State
    const error = useAppStore(selectError);
    const setError = useAppStore((state) => state.setError);
    const share = useAppStore(selectShareState);
    const textmodeRunnerUnavailable = useAppStore(selectTextmodeRunnerUnavailable);
    const textmodeRunnerReconnecting = useAppStore(selectTextmodeRunnerReconnecting);
    const showShareLock = Boolean(share.payload && !share.consented && !share.promptOpen);

    const hasLastWorking = useAppStore(selectHasLastWorkingForError);


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

                {textmodeRunnerUnavailable && (
                <div className="fixed inset-0 z-[1] pointer-events-none flex items-center justify-center p-6">
                    <div
                        className={cn(
                            'w-full max-w-xl rounded-xl border border-white/12',
                            'bg-zinc-950/70 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.55)]',
                            'px-5 py-4 text-zinc-100'
                        )}
                    >
                        <p className="text-[11px] uppercase tracking-[0.16em] text-amber-300/95">runner offline</p>
                        <h2 className="mt-1 text-base font-semibold text-zinc-100">textmode.js runner is not reachable</h2>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-300/95">
                            visual output is paused because the sandbox runner failed to load.
                        </p>
                    </div>
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
                            <p>sketch locked - click to unlock</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {textmodeRunnerUnavailable && (
                    <div className="fixed bottom-3 left-3 z-50 flex flex-col items-start gap-1 pointer-events-auto">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={onReconnectTextmodeRunner}
                            disabled={textmodeRunnerReconnecting}
                            className="gap-2 bg-zinc-900/95 text-zinc-100 shadow-lg hover:bg-zinc-800"
                            aria-live="polite"
                            aria-busy={textmodeRunnerReconnecting}
                        >
                            <RotateCcw
                                className={cn(
                                    'h-3.5 w-3.5 transition-transform duration-300',
                                    textmodeRunnerReconnecting ? 'animate-spin' : ''
                                )}
                            />
                            {textmodeRunnerReconnecting ? 'Reconnecting…' : 'Reconnect Runner'}
                        </Button>
                        <p className="text-[11px] text-zinc-400/80">
                            {textmodeRunnerReconnecting
                                ? 'Attempting to reach the runner...'
                                : 'Tap to retry loading the sandbox runner.'}
                        </p>
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
                            onToggleStrudelTransport={onToggleStrudelTransport}
                            onMakeRandomChange={onMakeRandomChange}
                            strudelEnabled={strudelEnabled}
                            strudelTransport={strudelTransport}
                            randomizeLoading={randomizeLoading}
                            onClearStorage={onClearStorage}
                            onLoadExample={onLoadExample}
                            slugInfoAutoOpenEnabled={!welcomeOpen}
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
