import { ExternalLink, User, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { GallerySketchSummary } from '../types';

interface SketchMetaCardProps {
	sketch: GallerySketchSummary;
	showDismiss?: boolean;
	onDismiss?: () => void;
	className?: string;
}

const LICENSE_LINKS: Record<string, string> = {
	MIT: 'https://opensource.org/licenses/MIT',
	'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
	'Apache 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
	'BSD-3-Clause': 'https://opensource.org/licenses/BSD-3-Clause',
	'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
	'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
	'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
	'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
	'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
	'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
	'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
	'CC-BY-NC-4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
	'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
	'CC-BY-NC-SA-4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
	'CC BY-ND 4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
	'CC-BY-ND-4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
	'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
	'CC-BY-NC-ND-4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
	'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0',
	'GPL-3.0-or-later': 'https://www.gnu.org/licenses/gpl-3.0',
	'AGPL-3.0': 'https://www.gnu.org/licenses/agpl-3.0',
	'AGPL-3.0-or-later': 'https://www.gnu.org/licenses/agpl-3.0',
	Unlicense: 'https://unlicense.org/',
	WTFPL: 'http://www.wtfpl.net/',
};

export function SketchMetaCard({ sketch, showDismiss = false, onDismiss, className }: SketchMetaCardProps) {
	const socialLinks = sketch.socialLinks ?? [];
	const socialLinkKeyCounts = new Map<string, number>();

	return (
		<section
			className={cn(
				'relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950/95 p-3 shadow-lg shadow-black/40',
				className
			)}
			aria-label="Sketch information"
		>
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<h3 className="text-[15px] font-semibold leading-tight text-zinc-50 break-words min-w-0">
						{sketch.title}
					</h3>
				</div>

				{showDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
						aria-label="Dismiss sketch info"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>

			{sketch.description && (
				<p className="mt-2 max-h-28 overflow-auto text-[12px] leading-5 text-zinc-300/90 whitespace-pre-wrap break-words">
					{sketch.description}
				</p>
			)}

			{(sketch.authorName || sketch.license || socialLinks.length > 0 || sketch.slug) && (
				<div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
					{sketch.authorName && (
						<span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 max-w-[10rem]">
							<User className="h-3 w-3 shrink-0" />
							<span className="truncate">{sketch.authorName}</span>
						</span>
					)}
					{sketch.license && <LicenseBadge license={sketch.license} />}
					{socialLinks.map((link) => {
						const baseKey = `${link.url}::${link.label}`;
						const occurrenceCount = socialLinkKeyCounts.get(baseKey) ?? 0;
						socialLinkKeyCounts.set(baseKey, occurrenceCount + 1);
						const displayLabel = getDisplayLink(link.label, link.url);
						return (
							<a
								key={`${baseKey}::${occurrenceCount}`}
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 max-w-[9rem]"
							>
								<ExternalLink className="h-3 w-3 shrink-0" />
								<span className="truncate">{displayLabel}</span>
							</a>
						);
					})}
					<span className="inline-flex min-w-0 max-w-full items-center rounded-full border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 text-violet-200">
						<span className="break-all">/s/{sketch.slug}/</span>
					</span>
				</div>
			)}
		</section>
	);
}

function LicenseBadge({ license }: { license: string }) {
	const url = LICENSE_LINKS[license];
	if (!url) {
		return <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{license}</span>;
	}

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
		>
			<ExternalLink className="h-3 w-3 shrink-0" />
			<span>{license}</span>
		</a>
	);
}

function getDisplayLink(label: string, url: string): string {
	const cleanLabel = label.trim();
	if (cleanLabel) return cleanLabel;

	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}
