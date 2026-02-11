import { ExternalLink, User, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';

export interface SlugInfoCardSketch {
    status?: 'PENDING' | 'APPROVED';
    slug: string;
    title: string;
    description: string | null;
    authorName: string | null;
    license: string | null;
    socialLinks: Array<{ label: string; url: string }> | null;
}

interface SlugInfoCardProps {
    sketch: SlugInfoCardSketch;
    showDismiss?: boolean;
    onDismiss?: () => void;
    className?: string;
}

function getDisplayLink(label: string, url: string) {
    const cleanLabel = label.trim();
    if (cleanLabel) return cleanLabel;

    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

const LICENSE_LINKS: Record<string, string> = {
    'MIT': 'https://opensource.org/licenses/MIT',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'Apache 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'Unlicense': 'https://unlicense.org/',
    'BSD-3-Clause': 'https://opensource.org/licenses/BSD-3-Clause',
    'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0',
    'WTFPL': 'http://www.wtfpl.net/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY-ND 4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
    'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
};

export function SlugInfoCard({
    sketch,
    showDismiss = false,
    onDismiss,
    className,
}: SlugInfoCardProps) {
    const isPending = sketch.status === 'PENDING';
    const socialLinks = isPending ? [] : (sketch.socialLinks ?? []);

    return (
        <section
            className={cn(
                'relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950/95 p-3 shadow-lg shadow-black/40',
                className
            )}
            aria-label="Sketch information"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm sm:text-base font-semibold leading-snug break-words min-w-0">
                            {sketch.title}
                        </h3>
                        {isPending && (
                            <Badge
                                variant="outline"
                                className="border-amber-500/30 bg-amber-500/10 text-amber-200"
                            >
                                pending review
                            </Badge>
                        )}
                    </div>
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
                <div className="mt-2 max-h-28 overflow-auto rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-2 text-xs sm:text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
                    {sketch.description}
                </div>
            )}

            {isPending && (
                <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-200/90">
                    Social links will be added after approval.
                </div>
            )}

            {(sketch.authorName || sketch.license || socialLinks.length > 0 || sketch.slug) && (
                <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                    {sketch.authorName && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 max-w-[10rem]">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{sketch.authorName}</span>
                        </span>
                    )}
                    {sketch.license && (() => {
                        const url = LICENSE_LINKS[sketch.license];
                        if (url) {
                            return (
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                                >
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    <span>{sketch.license}</span>
                                </a>
                            );
                        }
                        return (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                                {sketch.license}
                            </span>
                        );
                    })()}
                    {socialLinks.map((link) => {
                        const displayLabel = getDisplayLink(link.label, link.url);
                        return (
                            <a
                                key={link.url}
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
                    {sketch.slug && (
                        <span className="inline-flex min-w-0 max-w-full items-center rounded-full border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 text-violet-200">
                            <span className="break-all">/s/{sketch.slug}</span>
                        </span>
                    )}
                </div>
            )}
        </section>
    );
}
