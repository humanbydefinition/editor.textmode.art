import { useEffect, useState } from 'react';
import { Bot, Download, Eye, X } from 'lucide-react';
import { useAppStore } from '@/platform/state/appStore';
import { Button } from '@/shared/ui/button';
import { FloatingActionButton } from '@/shared/ui/floating-action-button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

type Actions = {
	previewAgentProposal: () => Promise<boolean>;
	acceptAgentProposal: () => boolean;
	rejectAgentProposal: () => void;
	downloadPreparedExport: () => boolean;
	closePreparedExport: () => void;
};

export function AgentControls({ actions }: { actions: Actions }) {
	const [activityOpen, setActivityOpen] = useState(false);
	const agent = useAppStore((state) => state.agent);
	const proposal = agent.proposal;
	const artifact = agent.preparedExport;
	const [previewing, setPreviewing] = useState(false);

	useEffect(() => {
		if (proposal) setActivityOpen(true);
	}, [proposal]);
	const preview = async () => {
		setPreviewing(true);
		try {
			await actions.previewAgentProposal();
		} finally {
			setPreviewing(false);
		}
	};

	return (
		<>
			<FloatingActionButton
				className="fixed top-2 right-[2.5rem] z-50 pointer-events-auto"
				onClick={() => setActivityOpen(true)}
				aria-label={`Agent ${agent.support}${proposal ? ': proposal awaiting review' : ''}`}
				tooltip="agent activity"
			>
				<Bot className="h-[14px] w-[14px]" />
			</FloatingActionButton>
			<Dialog open={activityOpen} onOpenChange={setActivityOpen}>
				<DialogContent className="max-w-md bg-zinc-950 border-white/10 text-zinc-100">
					<DialogHeader>
						<DialogTitle>agent activity</DialogTitle>
						<DialogDescription>
							WebMCP tools update this shared editor; source and URLs are never logged here.
						</DialogDescription>
					</DialogHeader>
					<p className="text-xs text-zinc-400">
						{agent.support === 'ready' ? 'Agent ready' : `Agent ${agent.support}`} ·{' '}
						{agent.registeredTools.length} tools available
					</p>
					<div className="max-h-48 overflow-auto space-y-2 text-xs">
						{agent.activity.length === 0 ? (
							<p className="text-zinc-500">No agent calls yet.</p>
						) : (
							agent.activity
								.slice()
								.reverse()
								.map((entry) => (
									<div key={entry.id} className="rounded border border-white/10 px-2 py-1.5">
										<span className="text-zinc-200">{entry.tool.replace('textmode_', '')}</span>
										<span className="ml-2 text-zinc-500">
											{entry.status}
											{entry.durationMs !== undefined ? ` · ${entry.durationMs}ms` : ''}
										</span>
									</div>
								))
						)}
					</div>
				</DialogContent>
			</Dialog>
			<Dialog
				open={Boolean(proposal)}
				onOpenChange={(open) => {
					if (!open) actions.rejectAgentProposal();
				}}
			>
				<DialogContent showCloseButton={false} className="max-w-2xl bg-zinc-950 border-white/10 text-zinc-100">
					<DialogHeader>
						<DialogTitle>review agent proposal</DialogTitle>
						<DialogDescription>{proposal?.summary}</DialogDescription>
					</DialogHeader>
					<div className="rounded border border-white/10 bg-zinc-900/50 p-3 text-sm">
						<strong>{proposal?.addedLines}</strong> lines added · <strong>{proposal?.removedLines}</strong>{' '}
						lines removed · based on revision {proposal?.baseRevision}
					</div>
					<p className="text-xs text-amber-200/80">
						Preview runs proposed code only after your click, inside the existing sandbox. It never saves
						the proposal.
					</p>
					{proposal?.error && (
						<p role="status" className="text-sm text-red-300">
							{proposal.error}
						</p>
					)}
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={actions.rejectAgentProposal}>
							<X />
							Reject
						</Button>
						<Button
							variant="outline"
							disabled={previewing || proposal?.status === 'preview-ready'}
							onClick={preview}
						>
							<Eye />
							{previewing ? 'Previewing…' : 'Preview'}
						</Button>
						<Button disabled={proposal?.status !== 'preview-ready'} onClick={actions.acceptAgentProposal}>
							Accept and run
						</Button>
					</div>
				</DialogContent>
			</Dialog>
			<Dialog
				open={Boolean(artifact)}
				onOpenChange={(open) => {
					if (!open) actions.closePreparedExport();
				}}
			>
				<DialogContent className="max-w-sm bg-zinc-950 border-white/10 text-zinc-100">
					<DialogHeader>
						<DialogTitle>export prepared</DialogTitle>
						<DialogDescription>
							{artifact
								? `${artifact.format.toUpperCase()} · ${formatBytes(artifact.byteLength)} · expires ${new Date(artifact.expiresAt).toLocaleTimeString()}`
								: ''}
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={actions.closePreparedExport}>
							Close
						</Button>
						<Button onClick={actions.downloadPreparedExport}>
							<Download />
							Download
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

function formatBytes(bytes: number): string {
	return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KiB`;
}
