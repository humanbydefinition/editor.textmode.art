import { useEffect, useRef, useState } from 'react';
import { Info, Share2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { SlugInfoCard } from './SlugInfoCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/utils';

interface SlugInfoAlertProps {
    className?: string;
    autoOpenEnabled?: boolean;
    onShare?: () => void;
}

export function SlugInfoAlert({
    className,
    autoOpenEnabled = true,
    onShare,
}: SlugInfoAlertProps) {
    const sketch = useAppStore((state) => state.approvedSketch);
    const sketchSlug = sketch?.slug ?? null;
    const hasGallerySketch = Boolean(sketch);
    const buttonLabel = hasGallerySketch ? 'Gallery sketch info' : 'Share this sketch';
    const [open, setOpen] = useState(false);
    const previousSlugRef = useRef<string | null>(null);

    useEffect(() => {
        if (!autoOpenEnabled) {
            previousSlugRef.current = null;
            setOpen(false);
            return;
        }

        if (!sketchSlug) {
            previousSlugRef.current = null;
            setOpen(false);
            return;
        }

        if (previousSlugRef.current !== sketchSlug) {
            setOpen(true);
            previousSlugRef.current = sketchSlug;
        }
    }, [autoOpenEnabled, sketchSlug]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/40 text-zinc-400 backdrop-blur-md transition-all duration-300',
                        'border border-white/5',
                        'hover:scale-105 hover:bg-zinc-800/60 hover:text-white',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10',
                        className
                    )}
                    aria-label={buttonLabel}
                    title={buttonLabel}
                    aria-expanded={open}
                >
                    {hasGallerySketch ? (
                        <Info className="h-[14px] w-[14px]" />
                    ) : (
                        <Share2 className="h-[14px] w-[14px]" />
                    )}
                </button>
            </PopoverTrigger>

            {hasGallerySketch && sketch && (
                <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    className="w-[min(calc(100vw-1rem),360px)] border-white/10 bg-zinc-950/95 p-0 shadow-xl shadow-black/50"
                >
                    <SlugInfoCard
                        sketch={sketch}
                        showDismiss
                        onDismiss={() => setOpen(false)}
                        className="rounded-none border-0 bg-transparent shadow-none"
                    />
                </PopoverContent>
            )}

            {!hasGallerySketch && (
                <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    className="w-[min(calc(100vw-1rem),320px)] border-white/10 bg-zinc-950/95 p-3 shadow-xl shadow-black/50"
                >
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-white">this is your custom sketch</p>
                        <p className="text-xs text-zinc-400">
                            open share to copy a URL or submit it to the gallery for approval.
                        </p>
                        <Button
                            className="w-full bg-zinc-800 border border-white/10 text-zinc-200 hover:bg-zinc-700"
                            onClick={() => {
                                setOpen(false);
                                onShare?.();
                            }}
                        >
                            <Share2 className="h-4 w-4" />
                            open share dialog
                        </Button>
                    </div>
                </PopoverContent>
            )}
        </Popover>
    );
}
