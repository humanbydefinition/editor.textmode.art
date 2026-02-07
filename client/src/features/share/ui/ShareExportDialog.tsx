import { useEffect, useMemo, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ShareService, MAX_SHARE_URL_LENGTH } from '@/services/ShareService';
import type { SharePayload } from '@/types/share.types';
import { PublishRequestDialog } from '@/features/publish';
import { Check, Link2, Sparkles } from 'lucide-react';

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
}

function formatCount(value: number): string {
	return new Intl.NumberFormat('en-US').format(value);
}

export function ShareExportDialog({ open, data, onOpenChange, onCopyLink }: ShareExportDialogProps) {
	const [copied, setCopied] = useState<'textmode' | 'full' | null>(null);
	const [publishOpen, setPublishOpen] = useState(false);

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
			<DialogContent className="sm:max-w-[640px] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden">
				<DialogHeader className="px-6 py-4 border-b border-white/5 text-left">
					<DialogTitle className="text-l font-bold tracking-tight text-white">
						share sketch
					</DialogTitle>
					<DialogDescription className="text-sm text-zinc-400">
						share links include your code in the URL. pick what to export and copy the link.
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 pb-5 space-y-5">
					<div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4">
						<div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
							<span>includes:</span>
							<Badge variant="outline" className="border-zinc-700 text-zinc-300">
								textmode.js - {formatCount(computed.textmodeLength)} chars
							</Badge>
							{hasStrudel && (
								<Badge variant="outline" className="border-zinc-700 text-zinc-300">
									strudel - {formatCount(computed.strudelLength)} chars
								</Badge>
							)}
						</div>
						<p className="mt-3 text-xs text-zinc-500">
							link limit: {formatCount(MAX_SHARE_URL_LENGTH)} characters
						</p>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4 space-y-3">
							<div className="flex items-center justify-between">
								<div className="text-sm font-medium text-white">textmode only</div>
								{computed.textmodeFits ? (
									<Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
										fits
									</Badge>
								) : (
									<Badge className="bg-red-500/20 text-red-200 border border-red-500/30">
										too large
									</Badge>
								)}
							</div>

							<div className="text-xs text-zinc-400">
								link size: {formatCount(computed.textmodeUrl.length)}
							</div>
							<div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
								<div
									className={computed.textmodeFits ? 'h-full bg-emerald-400/80' : 'h-full bg-red-400/80'}
									style={{ width: `${textmodeRatio * 100}%` }}
								/>
							</div>

							<Button
								disabled={!computed.textmodeFits}
								className="w-full bg-zinc-800 border border-white/10 text-zinc-200 hover:bg-zinc-700"
								onClick={() => {
									onCopyLink(computed.textmodeUrl);
									setCopied('textmode');
								}}
							>
								{copied === 'textmode' ? (
									<>
										<Check className="w-4 h-4" />
										copied
									</>
								) : (
									<>
										<Link2 className="w-4 h-4" />
										copy link
									</>
								)}
							</Button>

							{!computed.textmodeFits && (
								<p className="text-[11px] text-red-300">
									textmode.js is too large to share via URL. shorten the sketch to enable sharing.
								</p>
							)}
						</div>

						{hasStrudel && (
							<div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4 space-y-3">
								<div className="flex items-center justify-between">
									<div className="text-sm font-medium text-white">textmode + strudel</div>
									{computed.fullFits ? (
										<Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
											fits
										</Badge>
									) : (
										<Badge className="bg-amber-500/20 text-amber-200 border border-amber-500/30">
											too large
										</Badge>
									)}
								</div>

								<div className="text-xs text-zinc-400">
									link size: {computed.fullUrl ? formatCount(computed.fullUrl.length) : '-'}
								</div>
								<div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
									<div
										className={computed.fullFits ? 'h-full bg-emerald-400/80' : 'h-full bg-amber-400/80'}
										style={{ width: `${(fullRatio ?? 0) * 100}%` }}
									/>
								</div>

								<Button
									disabled={!computed.fullFits}
									className="w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/30"
									onClick={() => {
										if (computed.fullUrl) {
											onCopyLink(computed.fullUrl);
											setCopied('full');
										}
									}}
								>
									{copied === 'full' ? (
										<>
											<Check className="w-4 h-4" />
											copied
										</>
									) : (
										<>
											<Link2 className="w-4 h-4" />
											copy link
										</>
									)}
								</Button>

								{!computed.fullFits && (
									<p className="text-[11px] text-amber-300">
										combined sketch exceeds the URL limit. share textmode only or shorten the code.
									</p>
								)}
							</div>
						)}
					</div>

					{/* Gallery publish section */}
					<div className="pt-4 border-t border-white/5">
						<div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
							<div className="flex items-start gap-3">
								<Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
								<div className="flex-1">
									<p className="text-sm font-medium text-white">publish to the gallery</p>
									<p className="text-xs text-zinc-400 mt-1">
										gallery submissions are reviewed before going live. approved sketches get a
										short URL like <span className="font-mono text-violet-300">/s/my-sketch</span> and will be
										discoverable via the randomize feature.
									</p>
								</div>
							</div>
							<Button
								className="w-full mt-3 bg-violet-500/20 border border-violet-500/30 text-violet-200 hover:bg-violet-500/30"
								onClick={() => setPublishOpen(true)}
							>
								<Sparkles className="w-4 h-4" />
								publish to gallery
							</Button>
						</div>
					</div>

				</div>
			</DialogContent>

			<PublishRequestDialog
				open={publishOpen}
				data={data ? { textmodeCode: data.textmodeCode, strudelCode: data.strudelCode } : null}
				onOpenChange={setPublishOpen}
			/>
		</Dialog>
	);
}
