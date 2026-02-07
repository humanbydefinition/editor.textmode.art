import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { Badge } from '@/shared/ui/badge';
import { useAppStore } from '@/platform/state/appStore';
import { selectShareState } from '@/platform/state/selectors';
import { X } from 'lucide-react';

interface ShareConsentDialogProps {
	onUnlockAndRun: () => void;
	onUnlockOnly: () => void;
	onDiscard: () => void;
}

export function ShareConsentDialog({ onUnlockAndRun, onUnlockOnly, onDiscard }: ShareConsentDialogProps) {
	const share = useAppStore(selectShareState);
	const isOpen = Boolean(share.payload && !share.consented && share.promptOpen);
	const [checked, setChecked] = useState(false);

	const includesStrudel = Boolean(share.payload?.engines.strudel);
	const includesTextmode = Boolean(share.payload?.engines.textmode);
	const engines = [
		includesTextmode ? 'textmode.js' : null,
		includesStrudel ? 'strudel' : null,
	].filter(Boolean) as string[];

	useEffect(() => {
		if (isOpen) {
			setChecked(false);
		}
	}, [isOpen, share.payload]);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onUnlockOnly();
				}
			}}
		>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-[520px] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden"
				overlayClassName="bg-black/90 backdrop-blur-lg"
			>
				<DialogHeader className="px-6 py-4 border-b border-white/5 text-left">
					<div className="flex items-center justify-between gap-4">
						<DialogTitle className="text-l font-bold tracking-tight text-white flex items-center gap-2">
							<AlertTriangle className="w-4 h-4 text-amber-400" />
							untrusted sketch
						</DialogTitle>
						<DialogClose
							onClick={onUnlockOnly}
							className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
						>
							<X className="w-4 h-4" />
							<span className="sr-only">View code</span>
						</DialogClose>
					</div>
					<DialogDescription className="text-sm text-zinc-400">
						this link contains code from another user. it will not run unless you explicitly unlock it.
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 pb-5 space-y-4">
					<div className="text-xs text-zinc-400 space-y-2">
						<p>included engines:</p>
						<div className="flex flex-wrap gap-2">
							{engines.length ? (
								engines.map((engine) => (
									<Badge key={engine} variant="outline" className="border-zinc-700 text-zinc-300">
										{engine}
									</Badge>
								))
							) : (
								<Badge variant="outline" className="border-zinc-700 text-zinc-300">
									unknown
								</Badge>
							)}
						</div>
					</div>

					<div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
						<label className="flex items-center gap-3 text-xs text-amber-200/80">
							<input
								type="checkbox"
								checked={checked}
								onChange={(event) => setChecked(event.target.checked)}
								className="h-4 w-4 rounded border-amber-500/30 bg-zinc-900 text-amber-400 focus:ring-amber-400/40"
							/>
							<span>i understand this will execute code from another user</span>
						</label>
					</div>

					<div className="flex flex-wrap gap-3">
						<Button
							disabled={!checked}
							className="bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30"
							onClick={onUnlockAndRun}
						>
							unlock &amp; run
						</Button>
						<Button
							variant="outline"
							className="border-zinc-700 text-zinc-300 hover:text-white"
							onClick={onUnlockOnly}
						>
							view code
						</Button>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									className="text-zinc-500 hover:text-zinc-200"
									onClick={onDiscard}
								>
									discard sketch
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p>loads your saved or default sketches</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
