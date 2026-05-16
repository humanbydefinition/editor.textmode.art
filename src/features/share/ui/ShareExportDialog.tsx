import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { APP_META } from '@/shared/config/appMeta';
import { MAX_SHARE_URL_LENGTH, ShareService } from '../model/ShareService';
import type { SharePayload } from '@/features/share/types';

import { Check, ExternalLink, GitPullRequest, Info, Link2 } from 'lucide-react';

export interface ShareExportData {
	createdAt: number;
	textmodeCode: string;
}

export interface ShareExportDialogProps {
	open: boolean;
	data: ShareExportData | null;
	onOpenChange: (open: boolean) => void;
	onCopyLink: (url: string) => void;
}

function formatCount(value: number): string {
	return new Intl.NumberFormat('en-US').format(value);
}

export function ShareExportDialog({
	open,
	data,
	onOpenChange,
	onCopyLink,
}: ShareExportDialogProps) {
	const [copied, setCopied] = useState(false);

	const computed = useMemo(() => {
		if (!data) return null;
		const basePayload: SharePayload = {
			v: 1,
			createdAt: data.createdAt,
			engines: {
				textmode: data.textmodeCode,
			},
		};
		const textmodeUrl = ShareService.buildShareUrl(basePayload, window.location);
		const textmodeFits = textmodeUrl.length <= MAX_SHARE_URL_LENGTH;

		return {
			textmodeUrl,
			textmodeFits,
		};
	}, [data]);

	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), 1800);
		return () => window.clearTimeout(timer);
	}, [copied]);

	if (!data || !computed) {
		return null;
	}

	const textmodeRatio = Math.min(1, computed.textmodeUrl.length / MAX_SHARE_URL_LENGTH);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[450px] h-[90vh] sm:h-auto sm:max-h-[85vh] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden flex flex-col">
				<DialogHeader className="px-6 py-4 border-b border-white/5 text-left shrink-0">
					<DialogTitle className="text-base font-bold tracking-tight text-white">share sketch</DialogTitle>
					<DialogDescription className="text-xs text-zinc-400">
						links contain your code in the URL. copy a link to share your work.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="flex-1 min-h-0">
					<div className="px-6 pb-5 space-y-6">
						{/* Share Link */}
						<div>
							<div className="flex flex-col rounded-lg border border-white/10 bg-zinc-900/40 p-4 transition-all hover:border-white/20">
								<div className="space-y-3">
									<div className="space-y-1.5">
										<div className="flex justify-between text-[10px] font-mono text-zinc-500">
											<span>link size</span>
											<span className={computed.textmodeFits ? 'text-zinc-500' : 'text-red-400'}>
												{formatCount(computed.textmodeUrl.length)} /{' '}
												{formatCount(MAX_SHARE_URL_LENGTH)}
											</span>
										</div>
										<div className="h-1 rounded-full bg-zinc-800/50 overflow-hidden">
											<div
												className={
													computed.textmodeFits
														? 'h-full bg-emerald-500/60'
														: 'h-full bg-red-500/60'
												}
												style={{ width: `${textmodeRatio * 100}%` }}
											/>
										</div>
									</div>

									<Button
										disabled={!computed.textmodeFits}
										className="w-full h-9 bg-zinc-800 border border-white/5 text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all text-xs"
										onClick={() => {
											onCopyLink(computed.textmodeUrl);
											setCopied(true);
										}}
									>
										{copied ? (
											<Check className="w-3.5 h-3.5 mr-2 text-emerald-400" />
										) : (
											<Link2 className="w-3.5 h-3.5 mr-2" />
										)}
										{copied ? 'copied!' : 'copy link'}
									</Button>
								</div>
							</div>
						</div>

						{/* Warnings */}
						{!computed.textmodeFits && (
							<div className="p-3 rounded-lg border border-amber-500/10 bg-amber-500/[0.02] flex gap-3">
								<Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
								<p className="text-[11px] text-amber-200/70 leading-relaxed">
									the sketch is too large for a URL. shorten the code to enable sharing.
								</p>
							</div>
						)}

						<div className="rounded-lg border border-violet-400/15 bg-violet-500/[0.04] p-4">
							<div className="flex items-start gap-3">
								<GitPullRequest className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
								<div className="min-w-0 space-y-3">
									<div className="space-y-1">
										<h3 className="text-sm font-semibold leading-tight text-zinc-100">
											contribute to the gallery
										</h3>
										<p className="text-[12px] leading-5 text-zinc-400">
											to make this sketch discoverable through random gallery loading, add it under{' '}
											<span className="font-mono text-zinc-300">sketches/&lt;slug&gt;</span> and
											open a pull request on GitHub.
										</p>
									</div>

									<div className="flex flex-wrap gap-2">
										<Button
											asChild
											className="h-8 bg-violet-500/15 border border-violet-300/20 px-3 text-xs text-violet-100 hover:bg-violet-500/25"
										>
											<a href={APP_META.urls.galleryPullRequest} target="_blank" rel="noopener noreferrer">
												<GitPullRequest className="h-3.5 w-3.5" />
												open PR
											</a>
										</Button>
										<Button
											asChild
											variant="ghost"
											className="h-8 px-3 text-xs text-zinc-400 hover:text-white"
										>
											<a
												href={APP_META.urls.galleryContributionGuide}
												target="_blank"
												rel="noopener noreferrer"
											>
												<ExternalLink className="h-3.5 w-3.5" />
												contribution guide
											</a>
										</Button>
									</div>
								</div>
							</div>
						</div>

					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
