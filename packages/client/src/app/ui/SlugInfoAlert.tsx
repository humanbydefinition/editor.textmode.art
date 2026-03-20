import { useEffect, useRef, useState } from 'react';
import { Info, Share2 } from 'lucide-react';
import { useAppStore } from '@/platform/state/appStore';
import { selectShareState, selectSlugSketchInfo } from '@/platform/state/selectors';
import { SlugInfoCard } from '@/shared/components/SlugInfoCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/cn';
import { floatingIconButtonVariants } from '@/shared/ui/floating-icon-button';
import { SLUG_INFO_POPOVER_DISMISS_EVENT } from '@/platform/events/popoverEvents';

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
	const sketch = useAppStore(selectSlugSketchInfo);
	const share = useAppStore(selectShareState);
	const isPendingSketch = sketch?.status === 'PENDING';
	const pendingUnlocked = !isPendingSketch || share.consented;
	const sketchSlug = sketch?.slug ?? null;
	const hasGallerySketch = Boolean(sketch && pendingUnlocked);
	const buttonLabel = hasGallerySketch ? 'Gallery sketch info' : 'Share sketch';
	const [open, setOpen] = useState(false);
	const previousSlugRef = useRef<string | null>(null);

	useEffect(() => {
		if (!autoOpenEnabled || isPendingSketch) {
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
	}, [autoOpenEnabled, sketchSlug, isPendingSketch]);

	useEffect(() => {
		const handleDismiss = (): void => {
			setOpen(false);
		};
		window.addEventListener(SLUG_INFO_POPOVER_DISMISS_EVENT, handleDismiss);
		return () => {
			window.removeEventListener(SLUG_INFO_POPOVER_DISMISS_EVENT, handleDismiss);
		};
	}, []);

	if (isPendingSketch && !pendingUnlocked) {
		return null;
	}

	if (!hasGallerySketch) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
						<button
							type="button"
							className={cn(floatingIconButtonVariants(), className)}
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
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
							<button
								type="button"
								className={cn(floatingIconButtonVariants(), className)}
								aria-label={buttonLabel}
								aria-expanded={open}
							>
							<Info className="h-[14px] w-[14px]" />
						</button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>
					<p>sketch info</p>
				</TooltipContent>
			</Tooltip>

			{sketch && (
				<PopoverContent
					align="start"
					side="bottom"
					sideOffset={8}
					collisionPadding={8}
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
