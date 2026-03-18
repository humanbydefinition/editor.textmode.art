import { useEffect, useState } from 'react';
import { EditorLayout, MobileNav } from '@/features/editor-layout';
import { SystemMenu } from '@/features/system-menu';
import { Toaster } from '@/shared/ui/sonner';
import { WelcomeDialog } from '@/shared/components/WelcomeDialog';
import { cn } from '@/shared/lib/cn';
import { useAppStore } from '@/platform/state/appStore';
import {
    selectEngineErrors,
    selectShareState,
    selectTextmodeRunnerReconnecting,
    selectTextmodeRunnerUnavailable,
} from '@/platform/state/selectors';
import { ShareConsentDialog, ShareExportDialog, type ShareExportData } from '@/features/share';
import { PublishRequestDialog, SubmissionsPausedDialog } from '@/features/publish';
import { ExamplesTab } from '@/features/examples';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { useAppRuntime } from '@/app/runtime/AppRuntimeContext';
import { SlugInfoAlert } from './SlugInfoAlert';
import { RunnerUnavailableAlert } from './RunnerUnavailableAlert';
import { toast } from 'sonner';

/**
 * Root component for the application.
 * Renders both EditorLayout (editor panes) and the AppShell (UI layer).
 */
export function AppShell() {
    const [welcomeOpen, setWelcomeOpen] = useState(true);
    const [publishOpen, setPublishOpen] = useState(false);
    const [submissionsPausedOpen, setSubmissionsPausedOpen] = useState(false);

    // Local UI State for Share Export
    const [shareExportOpen, setShareExportOpen] = useState(false);
    const [shareExportData, setShareExportData] = useState<ShareExportData | null>(null);

    // Runtime Context
    const { actions, state: runtimeState, layout } = useAppRuntime();

    // Store State
    const engineErrors = useAppStore(selectEngineErrors);
    const textmodeHasLastWorking = useAppStore((state) => hasLastWorkingCode(state.engineStates.textmode?.lastWorkingCode));
    const clearEngineError = useAppStore((state) => state.clearEngineError);
    const share = useAppStore(selectShareState);
    const textmodeRunnerUnavailable = useAppStore(selectTextmodeRunnerUnavailable);
    const textmodeRunnerReconnecting = useAppStore(selectTextmodeRunnerReconnecting);
    const showShareLock = Boolean(share.payload && !share.consented && !share.promptOpen);

    useEffect(() => {
        for (const engineId of ERROR_TOAST_ENGINE_IDS) {
            const error = engineErrors[engineId];
            const toastId = getEngineErrorToastId(engineId);
            if (!error) {
                toast.dismiss(toastId);
                continue;
            }

            toast.error(getEngineErrorTitle(engineId), {
                id: toastId,
                toasterId: ENGINE_ERROR_TOASTER_ID,
                description: getEngineErrorDescription(error),
                duration: Number.POSITIVE_INFINITY,
                closeButton: true,
                action: hasLastWorkingForEngine(engineId, textmodeHasLastWorking)
                    ? {
                        label: 'revert',
                        onClick: () => {
                            actions.revertToLastWorkingForEngine(engineId);
                        },
                    }
                    : undefined,
                onDismiss: () => {
                    clearEngineError(engineId);
                },
            });
        }
    }, [engineErrors, textmodeHasLastWorking, clearEngineError]);

    const handleShare = () => {
        const data = actions.getShareExportData();
        setShareExportData(data);
        setShareExportOpen(true);
    };

    return (
        <>
            {/* Layout layer - editor panes with mobile nav */}
            <EditorLayout
                panes={layout.panes}
                editorBackdrop={runtimeState.editorBackdrop}
                onPaneReady={layout.onPaneReady}
            />

            {/* UI shell layer - elevated above editors */}
            <div
                id="shell-container"
                className="fixed inset-0 z-[100] pointer-events-none"
            >
                <RunnerUnavailableAlert
                    isVisible={textmodeRunnerUnavailable}
                    isReconnecting={textmodeRunnerReconnecting}
                    onReconnect={actions.reconnectTextmodeRunner}
                />

                <MobileNav />

                <WelcomeDialog onOpenChange={setWelcomeOpen} />

                {!welcomeOpen && (
                    <ShareConsentDialog
                        onUnlockAndRun={actions.unlockAndRun}
                        onUnlockOnly={actions.unlockOnly}
                        onDiscard={actions.discardShare}
                    />
                )}

                <ShareExportDialog
                    open={shareExportOpen}
                    data={shareExportData}
                    onOpenChange={setShareExportOpen}
                    onCopyLink={actions.copyShareExportUrl}
                    onPublishRequested={() => setPublishOpen(true)}
                    onSubmissionsPaused={() => setSubmissionsPausedOpen(true)}
                />

                <PublishRequestDialog
                    open={publishOpen}
                    data={shareExportData ? { textmodeCode: shareExportData.textmodeCode } : null}
                    onOpenChange={setPublishOpen}
                />

                <SubmissionsPausedDialog
                    open={submissionsPausedOpen}
                    onOpenChange={setSubmissionsPausedOpen}
                />

                {showShareLock && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={actions.openSharePrompt}
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

                {/* Main UI - hidden when welcome modal is open, with smooth transition */}
                <div
                    className={cn(
                        "transition-opacity duration-500 ease-out pointer-events-none",
                        welcomeOpen ? "opacity-0" : "opacity-100"
                    )}
                >
                    {!showShareLock && (
                        <>
                            <SlugInfoAlert
                                autoOpenEnabled={!welcomeOpen}
                                onShare={handleShare}
                                className="fixed top-2 right-[8.5rem] z-50 pointer-events-auto"
                            />

                            <SystemMenu
                                onShare={handleShare}
                                onRandomize={actions.randomize}
                                onMakeRandomChange={actions.makeRandomChange}
                                randomizeLoading={runtimeState.randomizeLoading}
                                onResetRunners={actions.resetRunners}
                                onClearStorage={actions.clearStorage}
                                renderExamplesTab={(onClose) => (
                                    <ExamplesTab onLoadExample={actions.loadExample} onClose={onClose} />
                                )}
                            />
                        </>
                    )}

                </div>
            </div>
            <Toaster />
            <Toaster
                id={ENGINE_ERROR_TOASTER_ID}
                position="bottom-left"
                visibleToasts={2}
                swipeDirections={[]}
                offset={8}
                className="pointer-events-auto"
            />
        </>
    );
}

const ERROR_TOAST_ENGINE_IDS = ['textmode'] as const;
const ENGINE_ERROR_TOASTER_ID = 'engine-errors';

function getEngineErrorToastId(engineId: string): string {
    return `engine-error-${engineId}`;
}

function getEngineErrorTitle(engineId: string): string {
    return `${engineId} pane error`;
}

function getEngineErrorDescription(error: { message: string; line?: number; column?: number }): string {
    const location = error.line !== undefined
        ? `line ${error.line}${error.column !== undefined ? `:${error.column}` : ''}`
        : null;

    return location ? `${location}: ${error.message}` : error.message;
}

function hasLastWorkingCode(code: string | null | undefined): boolean {
    return code !== null && code !== undefined;
}

function hasLastWorkingForEngine(engineId: string, textmodeHasLastWorking: boolean): boolean {
    if (engineId === 'textmode') return textmodeHasLastWorking;
    return false;
}
