import { useEffect, useRef, useState } from 'react';
import { Info, Share2 } from 'lucide-react';
import { useAppStore } from '@/platform/state/appStore';
import { selectApprovedSketch } from '@/platform/state/selectors';
import { SlugInfoCard } from './SlugInfoCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/cn';

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
    const sketch = useAppStore(selectApprovedSketch);
    const sketchSlug = sketch?.slug ?? null;
    const hasGallerySketch = Boolean(sketch);
    const buttonLabel = hasGallerySketch ? 'Gallery sketch info' : 'Share sketch';
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

    if (!hasGallerySketch) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
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
                        onClick={() => onShare?.()}
                    >
                        <Share2 className="h-[14px] w-[14px]" />
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>share sketch</p>
                </TooltipContent>
            </Tooltip>
        );
    }

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
                    aria-expanded={open}
                >
                    <Info className="h-[14px] w-[14px]" />
                </button>
            </PopoverTrigger>

            {sketch && (
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
        </Popover>
    );
}
