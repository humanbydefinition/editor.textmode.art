import { useEffect, useRef, useState } from 'react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/appStore';
import { ExternalLink, X } from 'lucide-react';

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
};

export function SlugInfoAlert() {
    const sketch = useAppStore((state) => state.approvedSketch);
    const [dismissed, setDismissed] = useState(false);
    const [visible, setVisible] = useState(false);
    const alertRef = useRef<HTMLDivElement>(null);

    // Animate in on mount
    useEffect(() => {
        if (sketch && !dismissed) {
            const frame = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(frame);
        }
    }, [sketch, dismissed]);

    if (!sketch || dismissed) return null;

    const socialLinks = sketch.socialLinks ?? [];

    return (
        <div
            ref={alertRef}
            className={[
                // Safe-area-aware positioning — uses inset so total width = 100vw − insets
                'fixed inset-x-3 top-3 sm:inset-x-auto sm:top-4 sm:left-4 z-[120] pointer-events-auto',
                // Max width only kicks in on wider viewports where we pin to the left
                'sm:max-w-[min(calc(100vw-2rem),520px)]',
                // Entry animation
                'transition-all duration-300 ease-out',
                visible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-2',
            ].join(' ')}
            role="region"
            aria-label="Sketch information"
        >
            <Alert className="relative shadow-lg shadow-black/40 overflow-hidden">
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

                    <button
                        type="button"
                        onClick={() => {
                            setVisible(false);
                            // Wait for fade-out before unmounting
                            setTimeout(() => setDismissed(true), 200);
                        }}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
                        aria-label="Dismiss sketch info"
                    >
                        <X className="h-4 w-4" />
                    </button>
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
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 truncate max-w-[10rem]">
                                by {sketch.authorName}
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
        </div>
    );
}
