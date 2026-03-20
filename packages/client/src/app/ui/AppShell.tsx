import { useEffect, useState } from 'react';
import { EditorLayout } from '@/features/editor-layout';
import { WelcomeDialog } from '@/features/onboarding';
import { SystemMenu } from '@/features/system-menu';
import { Toaster } from '@/shared/ui/sonner';
import { cn } from '@/shared/lib/cn';
import { useAppStore } from '@/platform/state/appStore';
import {
	selectEditorBackdrop,
	selectError,
	selectRandomizeLoading,
	selectShareConsented,
	selectSharePayload,
	selectSharePromptOpen,
	selectTextmodeRunnerReconnecting,
	selectTextmodeRunnerUnavailable,
} from '@/platform/state/selectors';
import { ShareConsentDialog, ShareExportDialog, type ShareExportData } from '@/features/share';
import { PublishRequestDialog, SubmissionsPausedDialog } from '@/features/publish';
import { ExamplesTab } from '@/features/examples';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { floatingIconButtonVariants } from '@/shared/ui/floating-icon-button';
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
	const { actions, layout } = useAppRuntime();

	// Store State
	const editorBackdrop = useAppStore(selectEditorBackdrop);
	const randomizeLoading = useAppStore(selectRandomizeLoading);
	const error = useAppStore(selectError);
	const textmodeHasLastWorking = useAppStore((state) => hasLastWorkingCode(state.lastWorkingCode));
	const clearError = useAppStore((state) => state.clearError);
	const sharePayload = useAppStore(selectSharePayload);
	const shareConsented = useAppStore(selectShareConsented);
	const sharePromptOpen = useAppStore(selectSharePromptOpen);
	const textmodeRunnerUnavailable = useAppStore(selectTextmodeRunnerUnavailable);
	const textmodeRunnerReconnecting = useAppStore(selectTextmodeRunnerReconnecting);
	const showShareLock = Boolean(sharePayload && !shareConsented && !sharePromptOpen);

	useEffect(() => {
		const toastId = 'textmode-error';
		if (!error) {
			toast.dismiss(toastId);
			return;
		}

		toast.error('textmode pane error', {
			id: toastId,
			toasterId: ENGINE_ERROR_TOASTER_ID,
			description: getErrorDescription(error),
			duration: Number.POSITIVE_INFINITY,
			closeButton: true,
			action: textmodeHasLastWorking
				? {
						label: 'revert',
						onClick: () => {
							actions.revertToLastWorking();
						},
					}
				: undefined,
			onDismiss: () => {
				clearError();
			},
		});
	}, [error, textmodeHasLastWorking, clearError]);

	const handleShare = () => {
		const data = actions.getShareExportData();
		setShareExportData(data);
		setShareExportOpen(true);
	};

	return (
		<>
			{/* Layout layer - single editor pane */}
			<EditorLayout editorBackdrop={editorBackdrop} onTextmodeReady={layout.onTextmodeReady} />

			{/* UI shell layer - elevated above editors */}
			<div id="shell-container" className="fixed inset-0 z-[100] pointer-events-none">
				<RunnerUnavailableAlert
					isVisible={textmodeRunnerUnavailable}
					isReconnecting={textmodeRunnerReconnecting}
					onReconnect={actions.reconnectTextmodeRunner}
				/>

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

				<SubmissionsPausedDialog open={submissionsPausedOpen} onOpenChange={setSubmissionsPausedOpen} />

				{showShareLock && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={actions.openSharePrompt}
								className={cn(
									floatingIconButtonVariants({ tone: 'warning' }),
									'fixed bottom-2 right-2 z-50 pointer-events-auto',
									'duration-200'
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
						'transition-opacity duration-500 ease-out pointer-events-none',
						welcomeOpen ? 'opacity-0' : 'opacity-100'
					)}
				>
					{!showShareLock && (
						<>
							<SlugInfoAlert
								autoOpenEnabled={!welcomeOpen}
								onShare={handleShare}
								className="fixed top-2 right-[6.5rem] z-50 pointer-events-auto"
							/>

							<SystemMenu
								onShare={handleShare}
								onRandomize={actions.randomize}
								onMakeRandomChange={actions.makeRandomChange}
								randomizeLoading={randomizeLoading}
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

const ENGINE_ERROR_TOASTER_ID = 'engine-errors';

function getErrorDescription(error: { message: string; line?: number; column?: number }): string {
	const location =
		error.line !== undefined ? `line ${error.line}${error.column !== undefined ? `:${error.column}` : ''}` : null;

	return location ? `${location}: ${error.message}` : error.message;
}

function hasLastWorkingCode(code: string | null | undefined): boolean {
	return code !== null && code !== undefined;
}
