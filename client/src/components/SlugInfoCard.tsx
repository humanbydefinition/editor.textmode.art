import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ExternalLink, User, X } from 'lucide-react';
import { cn } from '@/utils/utils';

export interface SlugInfoCardSketch {
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
    const cleanLabel = label.trim().toLowerCase();
    const host = (() => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    })();

    return {
        label: cleanLabel || host,
        host,
    };
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
    'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
};

export function SlugInfoCard({
    sketch,
    showDismiss = false,
    onDismiss,
    className,
}: SlugInfoCardProps) {
    const socialLinks = sketch.socialLinks ?? [];

    return (
        <Alert className={cn('relative shadow-lg shadow-black/40 overflow-hidden', className)}>
            {/* Header Row: Title + Badge + Close button */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                    <AlertTitle className="text-sm sm:text-base font-semibold leading-snug break-words min-w-0 shrink">
                        {sketch.title}
                    </AlertTitle>
                    <Badge className="border border-violet-400/40 bg-violet-500/15 text-violet-200 text-[11px] sm:text-xs whitespace-nowrap shrink-0">
                        /s/{sketch.slug}
                    </Badge>
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

            {/* Description — readonly scrollable textarea */}
            {sketch.description && (
                <Textarea
                    value={sketch.description}
                    readOnly
                    tabIndex={-1}
                    className="mt-2 max-h-28 min-h-0 resize-none border-white/5 bg-white/[0.03] text-xs sm:text-sm leading-relaxed text-zinc-300 cursor-default focus-visible:ring-0 focus-visible:border-white/5 shadow-none"
                />
            )}

            {/* Metadata pills — author, license, social links */}
            {(sketch.authorName || sketch.license || socialLinks.length > 0) && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
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
                                    rel="noreferrer"
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
                        const display = getDisplayLink(link.label, link.url);
                        return (
                            <a
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 max-w-[9rem]"
                            >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span className="truncate">{display.label}</span>
                            </a>
                        );
                    })}
                </div>
            )}
        </Alert>
    );
}
