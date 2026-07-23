import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { buildLegalHref } from '@/shared/config/appMeta';
import { useAppStore } from '@/platform/state/appStore';
import { selectShareConsented, selectSharePayload, selectSharePromptOpen } from '@/platform/state/selectors';
import { X } from 'lucide-react';

interface ShareConsentDialogProps {
	onUnlockAndRun: () => void;
	onUnlockOnly: () => void;
	onDiscard: () => void;
	onKeepLocked: () => void;
}

export function ShareConsentDialog({ onUnlockAndRun, onUnlockOnly, onDiscard, onKeepLocked }: ShareConsentDialogProps) {
	const sharePayload = useAppStore(selectSharePayload);
	const shareConsented = useAppStore(selectShareConsented);
	const sharePromptOpen = useAppStore(selectSharePromptOpen);
	const isOpen = Boolean(sharePayload && !shareConsented && sharePromptOpen);
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setChecked(false);
		}
	}, [isOpen, sharePayload]);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onKeepLocked();
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
							onClick={onKeepLocked}
							className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
						>
							<X className="w-4 h-4" />
							<span className="sr-only">Keep locked</span>
						</DialogClose>
					</div>
					<DialogDescription className="text-sm text-zinc-400">
						this link contains unreviewed third-party code. it will not run unless you explicitly unlock it.
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 pb-5 space-y-4">
					<div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
						<ul className="list-disc list-outside pl-5 space-y-1 text-xs text-amber-200/90 mb-3">
							<li>may execute expensive loops, audio, and external requests</li>
							<li>may contain illegal, offensive, or unsafe content</li>
							<li>no warranty for safety, legality, or fitness of unapproved sketches</li>
						</ul>
						<label className="flex items-center gap-3 text-xs text-amber-200/80">
							<input
								type="checkbox"
								checked={checked}
								onChange={(event) => setChecked(event.target.checked)}
								className="h-4 w-4 rounded border-amber-500/30 bg-zinc-900 text-amber-400 focus:ring-amber-400/40"
							/>
							<span>i understand i am executing third-party code at my own responsibility</span>
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
								<p>loads your saved or the default sketch</p>
							</TooltipContent>
						</Tooltip>
					</div>

					<p className="text-[11px] text-zinc-500 leading-relaxed">
						by unlocking, you agree to the{' '}
						<a
							href={buildLegalHref('terms')}
							target="_blank"
							rel="noopener noreferrer"
							className="text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2"
						>
							terms &amp; acceptable use
						</a>
						.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
