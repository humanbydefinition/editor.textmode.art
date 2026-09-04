import { useEffect, useState } from 'react';
import { WelcomeDialog } from '@/features/onboarding';
import { SystemMenu } from '@/features/system-menu';
import { Toaster } from '@/shared/ui/sonner';
import { cn } from '@/shared/lib/cn';
import { useAppStore } from '@/platform/state/appStore';
import { ShareConsentDialog, ShareExportDialog, type ShareExportData } from '@/features/share';
import { GallerySketchInfoButton } from '@/features/gallery-sketches';
import { Lock } from 'lucide-react';
import { FloatingActionButton } from '@/shared/ui/floating-action-button';
import type { AppRuntime } from '@/app/runtime/AppRuntime';
import { RunnerUnavailableAlert } from './RunnerUnavailableAlert';
import { toast } from 'sonner';
import { AnalyticsConsentBanner } from '@/features/analytics-consent/ui/AnalyticsConsentBanner';
import { AgentControls } from '@/features/webmcp/ui/AgentControls';

interface AppShellProps {
	actions: AppRuntime['actions'];
	layout: AppRuntime['layout'];
}

/**
 * Root component for the application.
 * Renders the editor pane and the UI shell layer.
 */
export function AppShell({ actions, layout }: AppShellProps) {
	const [welcomeOpen, setWelcomeOpen] = useState(true);

	// Local UI State for Share Export
	const [shareExportOpen, setShareExportOpen] = useState(false);
	const [shareExportData, setShareExportData] = useState<ShareExportData | null>(null);

	// Store State
	const editorBackdrop = useAppStore((state) => state.settings.editorBackdrop);
	const error = useAppStore((state) => state.error);
	const textmodeHasLastWorking = useAppStore((state) => state.lastWorkingCode !== null);
	const setError = useAppStore((state) => state.setError);
	const sharePayload = useAppStore((state) => state.share.payload);
	const shareConsented = useAppStore((state) => state.share.consented);
	const sharePromptOpen = useAppStore((state) => state.share.promptOpen);
	const gallerySketch = useAppStore((state) => state.gallerySketch);
	const hasLocalSketch = actions.hasLocalSketch();
	const textmodeRunnerStatus = useAppStore((state) => state.runnerStatus);
	const audioInput = useAppStore((state) => state.audioInput);
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
				setError(null);
			},
		});
	}, [error, textmodeHasLastWorking, setError]);

	useEffect(
		() =>
			actions.onRequestShareExport(() => {
				setShareExportData(actions.getShareExportData());
				setShareExportOpen(true);
			}),
		[actions]
	);

	const handleShare = () => {
		const data = actions.getShareExportData();
		setShareExportData(data);
		setShareExportOpen(true);
	};

	return (
		<>
			{/* Layout layer - single editor pane */}
			<div
				ref={(container) => {
					if (container) {
						layout.onTextmodeReady(container);
					}
				}}
				id="editor-panel-textmode"
				className={`layout-pane panel-editor ${editorBackdrop ? 'editor-backdrop' : ''}`}
			/>

			{/* UI shell layer - elevated above editors */}
			<div id="shell-container" className="fixed inset-0 z-[100] pointer-events-none">
				<RunnerUnavailableAlert status={textmodeRunnerStatus} onReconnect={actions.reloadSandbox} />

				<WelcomeDialog onOpenChange={setWelcomeOpen} />

				{!welcomeOpen && (
					<ShareConsentDialog
						onUnlockAndRun={actions.unlockAndRun}
						onUnlockOnly={actions.unlockOnly}
						onDiscard={actions.discardShare}
						onKeepLocked={actions.keepShareLocked}
					/>
				)}

				<ShareExportDialog
					open={shareExportOpen}
					data={shareExportData}
					onOpenChange={setShareExportOpen}
					onCopyLink={actions.copyShareExportUrl}
				/>

				{showShareLock && (
					<FloatingActionButton
						onClick={actions.openSharePrompt}
						tone="warning"
						className={cn('fixed bottom-2 right-2 z-50 pointer-events-auto', 'duration-200')}
						aria-label="Sketch locked (click to unlock)"
						tooltip="sketch locked - click to unlock"
					>
						<Lock className="w-[14px] h-[14px]" />
					</FloatingActionButton>
				)}
				{!showShareLock && <AgentControls actions={actions} />}

				{/* Main UI - hidden when welcome modal is open, with smooth transition */}
				<div
					className={cn(
						'transition-opacity duration-500 ease-out pointer-events-none',
						welcomeOpen ? 'opacity-0' : 'opacity-100'
					)}
				>
					{!showShareLock && (
						<>
							<GallerySketchInfoButton
								sketch={gallerySketch}
								autoOpenEnabled={!welcomeOpen}
								onShare={handleShare}
								className="fixed top-2 right-[6.5rem] z-50 pointer-events-auto"
							/>

							<SystemMenu
								onShare={handleShare}
								onRandomize={actions.randomize}
								onMakeRandomChange={actions.makeRandomChange}
								onResetRunners={actions.reloadSandbox}
								isGallerySketchActive={Boolean(gallerySketch)}
								hasLocalSketch={hasLocalSketch}
								onRestoreLocalSketch={actions.restoreLocalSketch}
								audioInput={audioInput}
								onEnableAudioInput={actions.enableAudioInput}
								onDisableAudioInput={actions.disableAudioInput}
								onRefreshAudioInputDevices={actions.refreshAudioInputDevices}
								onSelectAudioInputDevice={actions.selectAudioInputDevice}
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
			<AnalyticsConsentBanner />
		</>
	);
}

const ENGINE_ERROR_TOASTER_ID = 'engine-errors';

function getErrorDescription(error: { message: string; line?: number; column?: number }): string {
	const location =
		error.line !== undefined ? `line ${error.line}${error.column !== undefined ? `:${error.column}` : ''}` : null;

	return location ? `${location}: ${error.message}` : error.message;
}
