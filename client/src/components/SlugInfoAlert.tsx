import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { SlugInfoCard } from './SlugInfoCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/utils';

interface SlugInfoAlertProps {
    className?: string;
    autoOpenEnabled?: boolean;
}

export function SlugInfoAlert({
    className,
    autoOpenEnabled = true,
}: SlugInfoAlertProps) {
    const sketch = useAppStore((state) => state.approvedSketch);
    const sketchSlug = sketch?.slug ?? null;
    const buttonLabel = sketch ? 'Gallery sketch info' : 'Gallery sketch info unavailable';
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
                    disabled={!sketch}
                    className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/40 text-zinc-400 backdrop-blur-md transition-all duration-300',
                        'border border-white/5',
                        'hover:scale-105 hover:bg-zinc-800/60 hover:text-white',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10',
                        'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
                        className
                    )}
                    aria-label={buttonLabel}
                    title={buttonLabel}
                    aria-expanded={sketch ? open : undefined}
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
