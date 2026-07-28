import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/shared/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip';
import { APP_META, buildLegalHref, LEGAL_LINKS } from '@/shared/config/appMeta';
import { getShortcut } from '@/platform/input/shortcuts';
import { GithubIcon } from '@/shared/assets/GithubIcon';
import { DiscordIcon } from '@/shared/assets/DiscordIcon';

const WELCOME_DISMISSED_KEY = 'textmode_welcome_dismissed';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const RUN_CODE_KEYS = getShortcut('run-code').keys.join('+');
const RESET_RUNTIME_KEYS = getShortcut('reset-runtime').keys.join('+');

interface WelcomeDialogProps {
	onOpenChange?: (isOpen: boolean) => void;
}

export function WelcomeDialog({ onOpenChange }: WelcomeDialogProps) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const dismissedAt = localStorage.getItem(WELCOME_DISMISSED_KEY);
		if (dismissedAt) {
			const dismissedTime = parseInt(dismissedAt, 10);
			const now = Date.now();
			if (now - dismissedTime < TWENTY_FOUR_HOURS_MS) {
				onOpenChange?.(false);
				return;
			}
		}
		setOpen(true);
		onOpenChange?.(true);
	}, [onOpenChange]);

	const handleClose = () => {
		localStorage.setItem(WELCOME_DISMISSED_KEY, Date.now().toString());
		setOpen(false);
		onOpenChange?.(false);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) handleClose();
			}}
		>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-[480px] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden"
				overlayClassName="bg-black/90 backdrop-blur-lg"
			>
				<DialogHeader className="px-6 py-4 border-b border-white/5 text-left">
					<div className="flex items-center justify-between">
						<div className="flex items-start gap-1">
							<DialogTitle className="text-l font-bold tracking-tight text-white flex items-center gap-2">
								{APP_META.name}
							</DialogTitle>
						</div>
						<div className="flex items-center gap-1">
							<Tooltip>
								<TooltipTrigger asChild>
									<a
										href={APP_META.urls.repo}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
									>
										<GithubIcon className="w-4 h-4" />
									</a>
								</TooltipTrigger>
								<TooltipContent side="top">
									<p>view source on github</p>
								</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<a
										href={APP_META.urls.discord}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
									>
										<DiscordIcon className="w-4 h-4" />
									</a>
								</TooltipTrigger>
								<TooltipContent side="top">
									<p>join our discord</p>
								</TooltipContent>
							</Tooltip>

							<DialogClose
								onClick={handleClose}
								className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
							>
								<X className="w-4 h-4" />
								<span className="sr-only">Close</span>
							</DialogClose>
						</div>
					</div>
					<DialogDescription className="text-sm text-zinc-400">{APP_META.description}</DialogDescription>
				</DialogHeader>

				<div className="px-6 pb-6 space-y-5">
					<div className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
						<AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
						<div className="space-y-1">
							<h4 className="text-sm font-medium text-amber-300">photosensitivity warning</h4>
							<p className="text-xs text-amber-200/70 leading-relaxed">
								this application displays rapidly changing visual patterns, flashing lights, and
								strobing effects that may potentially trigger seizures in individuals with
								photosensitive epilepsy or other photosensitivity conditions. viewer discretion is
								advised.
							</p>
						</div>
					</div>

					<div className="text-xs text-zinc-500 space-y-1.5">
						<p>
							<span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">
								{RUN_CODE_KEYS}
							</span>{' '}
							to run your code
						</p>
						<p>
							<span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">
								{RESET_RUNTIME_KEYS}
							</span>{' '}
							to reset the sketch runtime
						</p>
					</div>

					<button
						onClick={handleClose}
						className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-white/10 text-sm text-zinc-300 hover:text-white transition-all"
					>
						continue
					</button>

					<div className="flex w-full items-center justify-between gap-3 text-left">
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
							{LEGAL_LINKS.map((link) => (
								<a
									key={link.route}
									href={buildLegalHref(link.route)}
									target="_blank"
									rel="noopener noreferrer"
									className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
								>
									{link.label}
								</a>
							))}
							<a
								href={`mailto:${APP_META.contactEmail}`}
								className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
							>
								contact
							</a>
						</div>
						<a
							href={APP_META.urls.license}
							target="_blank"
							rel="noopener noreferrer"
							className="ml-auto whitespace-nowrap text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
						>
							licensed under {APP_META.licenseLabel}
						</a>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
