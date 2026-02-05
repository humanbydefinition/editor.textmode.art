import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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

export function SlugInfoAlert() {
    const sketch = useAppStore((state) => state.approvedSketch);
    const [dismissed, setDismissed] = useState(false);

    if (!sketch || dismissed) return null;

    const socialLinks = sketch.socialLinks ?? [];

    return (
        <div className="fixed top-4 left-4 z-[120] max-w-[min(92vw,520px)] pointer-events-auto">
            <Alert className="relative shadow-lg shadow-black/30">
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="absolute top-3 right-3 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    aria-label="Close sketch info"
                >
                    <X className="h-4 w-4" />
                </button>
                <div className="pr-9">
                    <div className="flex flex-wrap items-center gap-2">
                        <AlertTitle className="text-base font-semibold">{sketch.title}</AlertTitle>
                        <Badge className="border border-violet-400/40 bg-violet-500/15 text-violet-200">
                            /s/{sketch.slug}
                        </Badge>
                    </div>
                    {sketch.description && (
                        <AlertDescription className="mt-2 text-sm text-zinc-300">
                            {sketch.description}
                        </AlertDescription>
                    )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    {sketch.authorName && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                            by {sketch.authorName}
                        </span>
                    )}
                    {sketch.license && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                            {sketch.license}
                        </span>
                    )}
                    {socialLinks.map((link) => {
                        const display = getDisplayLink(link.label, link.url);
                        return (
                            <a
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
                            >
                                <ExternalLink className="h-3 w-3" />
                                <span className="truncate">{display.label}</span>
                            </a>
                        );
                    })}
                </div>
            </Alert>
        </div>
    );
}
