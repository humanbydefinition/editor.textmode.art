import { useState, useEffect } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';

export interface PublishRequestSuccessDialogProps {
	submittedSlug: string | null;
	onClose: () => void;
}

export function PublishRequestSuccessDialog({ submittedSlug, onClose }: PublishRequestSuccessDialogProps) {
	const [copied, setCopied] = useState(false);
	const slug = submittedSlug || 'your-sketch';
	const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
	const url = `${baseOrigin}/s/${slug}`;

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	const handleOpen = () => {
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	return (
		<div className="animate-in fade-in-0 zoom-in-95 duration-200">
			<DialogHeader>
				<DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
					<Check className="w-5 h-5 text-emerald-400" />
					request submitted
				</DialogTitle>
				<DialogDescription className="text-sm text-zinc-400 text-left">
					your sketch is pending review
				</DialogDescription>
			</DialogHeader>

			<div className="space-y-4 pt-2">
				<div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
					<p className="text-sm text-zinc-300">
						your publish request for <span className="font-mono text-emerald-300">/s/{slug}</span> has been
						submitted for moderation and is immediately viewable behind a code consent prompt.
					</p>
					<p className="text-xs text-zinc-500 mt-2">
						once approved, your sketch will appear in the community gallery, be discoverable via randomize,
						and show social links.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<Button
						variant="outline"
						className="w-full bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:text-white"
						onClick={handleCopy}
					>
						{copied ? (
							<>
								<Check className="w-4 h-4 mr-2 text-emerald-400" />
								copied!
							</>
						) : (
							<>
								<Copy className="w-4 h-4 mr-2" />
								copy link
							</>
						)}
					</Button>
					<Button
						variant="outline"
						className="w-full bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:text-white"
						onClick={handleOpen}
					>
						<ExternalLink className="w-4 h-4 mr-2" />
						open
					</Button>
				</div>

				<Button
					className="w-full bg-zinc-800 border border-white/10 text-zinc-200 hover:bg-zinc-700"
					onClick={onClose}
				>
					close
				</Button>
			</div>
		</div>
	);
}
