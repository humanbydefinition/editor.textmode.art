import { useEffect, useMemo, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/shared/ui/tooltip';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { MAX_SHARE_URL_LENGTH, ShareService } from '../model/ShareService';
import type { SharePayload } from '@/features/share/share.types';

import { fetchSketchSubmissionQueueStatus } from '@/platform/api/SketchApiService';
import { Check, Link2, Sparkles, Code2, Music2, Info } from 'lucide-react';

export interface ShareExportData {
	createdAt: number;
	textmodeCode: string;
	strudelCode?: string | null;
}

export interface ShareExportDialogProps {
	open: boolean;
	data: ShareExportData | null;
	onOpenChange: (open: boolean) => void;
	onCopyLink: (url: string) => void;
	onPublishRequested: () => void;
	onSubmissionsPaused: () => void;
}

function formatCount(value: number): string {
	return new Intl.NumberFormat('en-US').format(value);
}

export function ShareExportDialog({ open, data, onOpenChange, onCopyLink, onPublishRequested, onSubmissionsPaused }: ShareExportDialogProps) {
	const [copied, setCopied] = useState<'textmode' | 'full' | null>(null);
	const [isCheckingQueue, setIsCheckingQueue] = useState(false);

	const [backendAvailable, setBackendAvailable] = useState<boolean>(true);

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

		let fullUrl: string | null = null;
		let fullFits = false;
		if (data.strudelCode) {
			const fullPayload: SharePayload = {
				v: 1,
				createdAt: data.createdAt,
				engines: {
					textmode: data.textmodeCode,
					strudel: data.strudelCode,
				},
			};
			fullUrl = ShareService.buildShareUrl(fullPayload, window.location);
			fullFits = fullUrl.length <= MAX_SHARE_URL_LENGTH;
		}

		return {
			textmodeUrl,
			textmodeFits,
			fullUrl,
			fullFits,
			textmodeLength: data.textmodeCode.length,
			strudelLength: data.strudelCode?.length ?? 0,
		};
	}, [data]);

	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(null), 1800);
		return () => window.clearTimeout(timer);
	}, [copied]);

	useEffect(() => {
		if (open) {
			setBackendAvailable(true);
			fetchSketchSubmissionQueueStatus().then((status) => {
				setBackendAvailable(status !== null);
			});
		}
	}, [open]);

	const handlePublishClick = async () => {
		setIsCheckingQueue(true);
		try {
			const status = await fetchSketchSubmissionQueueStatus();
			if (status && status.full) {
				onSubmissionsPaused();
			} else if (status) {
				onPublishRequested();
			} else {
				// Status is null, meaning backend issue
				setBackendAvailable(false);
			}
		} catch (error) {
			console.error('Failed to check queue status:', error);
			setBackendAvailable(false);
		} finally {
			setIsCheckingQueue(false);
		}
	};

	if (!data || !computed) {
		return null;
	}

	const hasStrudel = Boolean(data.strudelCode);
	const textmodeRatio = Math.min(1, computed.textmodeUrl.length / MAX_SHARE_URL_LENGTH);
	const fullRatio = computed.fullUrl
		? Math.min(1, computed.fullUrl.length / MAX_SHARE_URL_LENGTH)
		: null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] h-[90vh] sm:h-auto sm:max-h-[85vh] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden flex flex-col">
				<DialogHeader className="px-6 py-4 border-b border-white/5 text-left shrink-0">
					<DialogTitle className="text-base font-bold tracking-tight text-white">
						share sketch
					</DialogTitle>
					<DialogDescription className="text-xs text-zinc-400">
						links contain your code in the URL. copy a link to share your work.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="flex-1 min-h-0">
					<div className="px-6 pb-5 space-y-6">
						{/* Capacity Info */}
						<div className="flex flex-wrap items-center justify-between mb-4 gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline" className="border-zinc-800 bg-zinc-900/40 text-zinc-400 h-6 px-2 text-[10px] uppercase tracking-wider">
									<Code2 className="w-3 h-3 mr-1 text-zinc-500" />
									textmode: {formatCount(computed.textmodeLength)}
								</Badge>
								{hasStrudel && (
									<Badge variant="outline" className="border-zinc-800 bg-zinc-900/40 text-zinc-400 h-6 px-2 text-[10px] uppercase tracking-wider">
										<Music2 className="w-3 h-3 mr-1 text-zinc-500" />
										strudel: {formatCount(computed.strudelLength)}
									</Badge>
								)}
							</div>
							<div className="text-[10px] font-mono text-zinc-600">
								limit: {formatCount(MAX_SHARE_URL_LENGTH)}
							</div>
						</div>

						{/* Export Options */}
						<div className={`grid gap-4 mb-4 ${hasStrudel ? 'sm:grid-cols-2' : ''}`}>
							{/* Textmode Card */}
							<div className="flex flex-col rounded-lg border border-white/10 bg-zinc-900/40 p-4 transition-all hover:border-white/20">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-2">
										<Code2 className="w-4 h-4 text-zinc-400" />
										<span className="text-sm font-semibold text-white">textmode</span>
									</div>
									{computed.textmodeFits ? (
										<Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] h-5 px-1.5">
											fits
										</Badge>
									) : (
										<Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] h-5 px-1.5">
											too large
										</Badge>
									)}
								</div>

								<div className="mt-auto space-y-3">
									<div className="space-y-1.5">
										<div className="flex justify-between text-[10px] font-mono text-zinc-500">
											<span>link size</span>
											<span>{formatCount(computed.textmodeUrl.length)}</span>
										</div>
										<div className="h-1 rounded-full bg-zinc-800/50 overflow-hidden">
											<div
												className={computed.textmodeFits ? 'h-full bg-emerald-500/60' : 'h-full bg-red-500/60'}
												style={{ width: `${textmodeRatio * 100}%` }}
											/>
										</div>
									</div>

									<Button
										disabled={!computed.textmodeFits}
										className="w-full h-9 bg-zinc-800 border border-white/5 text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all text-xs"
										onClick={() => {
											onCopyLink(computed.textmodeUrl);
											setCopied('textmode');
										}}
									>
										{copied === 'textmode' ? (
											<Check className="w-3.5 h-3.5 mr-2 text-emerald-400" />
										) : (
											<Link2 className="w-3.5 h-3.5 mr-2" />
										)}
										{copied === 'textmode' ? 'copied!' : 'copy link'}
									</Button>
								</div>
							</div>

							{/* Combined Card */}
							{hasStrudel && (
								<div className="flex flex-col rounded-lg border border-white/10 bg-zinc-900/40 p-4 transition-all hover:border-white/20">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-2">
											<Sparkles className="w-4 h-4 text-zinc-400" />
											<span className="text-sm font-semibold text-white">textmode + strudel</span>
										</div>
										{computed.fullFits ? (
											<Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] h-5 px-1.5">
												fits
											</Badge>
										) : (
											<Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] h-5 px-1.5">
												limit hit
											</Badge>
										)}
									</div>

									<div className="mt-auto space-y-3">
										<div className="space-y-1.5">
											<div className="flex justify-between text-[10px] font-mono text-zinc-500">
												<span>link size</span>
												<span>{computed.fullUrl ? formatCount(computed.fullUrl.length) : '-'}</span>
											</div>
											<div className="h-1 rounded-full bg-zinc-800/50 overflow-hidden">
												<div
													className={computed.fullFits ? 'h-full bg-emerald-500/60' : 'h-full bg-amber-500/60'}
													style={{ width: `${(fullRatio ?? 0) * 100}%` }}
												/>
											</div>
										</div>

										<Button
											disabled={!computed.fullFits}
											className="w-full h-9 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all text-xs"
											onClick={() => {
												if (computed.fullUrl) {
													onCopyLink(computed.fullUrl);
													setCopied('full');
												}
											}}
										>
											{copied === 'full' ? (
												<Check className="w-3.5 h-3.5 mr-2 text-emerald-400" />
											) : (
												<Link2 className="w-3.5 h-3.5 mr-2" />
											)}
											{copied === 'full' ? 'copied!' : 'copy combined'}
										</Button>
									</div>
								</div>
							)}
						</div>

						{/* Warnings */}
						{(!computed.textmodeFits || (hasStrudel && !computed.fullFits)) && (
							<div className="p-3 rounded-lg border border-amber-500/10 bg-amber-500/[0.02] flex gap-3">
								<Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
								<p className="text-[11px] text-amber-200/70 leading-relaxed">
									{!computed.textmodeFits
										? "the sketch is too large for a URL. shorten the code to enable sharing."
										: "combined sketch exceeds the URL limit. share textmode only or shorten the code."}
								</p>
							</div>
						)}

						{/* Gallery Section */}
						<div className="pt-0">
							<div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
								<div className="flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<Sparkles className="w-4 h-4 text-white" />
										<p className="text-sm font-semibold text-white">publish to gallery</p>
									</div>
									<p className="text-[11px] text-zinc-500 leading-relaxed max-w-[400px]">
										approved sketches get a short URL like <span className="text-zinc-300 font-mono">/s/slug</span> and appear in the community gallery.
									</p>
								</div>
								<TooltipProvider>
									<Tooltip delayDuration={0}>
										<TooltipTrigger asChild>
											<span tabIndex={0} className="inline-flex"> {/* Wrapper for disabled button tooltip trigger */}
												<Button
													className="h-9 px-4 bg-white text-zinc-950 hover:bg-zinc-200 transition-all text-xs font-bold shrink-0 min-w-[120px]"
													onClick={handlePublishClick}
													disabled={isCheckingQueue || !backendAvailable}
												>
													{isCheckingQueue ? (
														<span className="flex items-center gap-2">
															<span className="w-3 h-3 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin" />
															checking...
														</span>
													) : (
														'publish sketch'
													)}
												</Button>
											</span>
										</TooltipTrigger>
										{!backendAvailable && (
											<TooltipContent side="top">
												<p>backend is not responding</p>
											</TooltipContent>
										)}
									</Tooltip>
								</TooltipProvider>
							</div>
						</div>
					</div>
				</ScrollArea>
			</DialogContent>


		</Dialog>
	);
}
