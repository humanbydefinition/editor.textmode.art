import { useEffect, useRef, useState } from 'react';
import { Info, Share2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { floatingIconButtonVariants } from '@/shared/ui/floating-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import type { GallerySketchSummary } from '../types';
import { SketchMetaCard } from './SketchMetaCard';

interface GallerySketchInfoButtonProps {
	sketch: GallerySketchSummary | null;
	className?: string;
	autoOpenEnabled?: boolean;
	onShare: () => void;
}

export function GallerySketchInfoButton({
	sketch,
	className,
	autoOpenEnabled = true,
	onShare,
}: GallerySketchInfoButtonProps) {
	const [open, setOpen] = useState(false);
	const previousSlugRef = useRef<string | null>(null);
	const panelRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const sketchSlug = sketch?.slug ?? null;

	useEffect(() => {
		if (!autoOpenEnabled || !sketchSlug) {
			previousSlugRef.current = null;
			setOpen(false);
			return;
		}

		if (previousSlugRef.current !== sketchSlug) {
			setOpen(true);
			previousSlugRef.current = sketchSlug;
		}
	}, [autoOpenEnabled, sketchSlug]);

	useEffect(() => {
		if (!open) return;

		const handlePointerDown = (event: PointerEvent): void => {
			const target = event.target as Node | null;
			if (!target) return;
			if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
			setOpen(false);
		};

		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') {
				setOpen(false);
			}
		};

		document.addEventListener('pointerdown', handlePointerDown, true);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, true);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [open]);

	if (!sketch) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						className={cn(floatingIconButtonVariants(), className)}
						aria-label="Share sketch"
						onClick={onShare}
						onMouseDown={(event) => event.preventDefault()}
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
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						ref={buttonRef}
						type="button"
						className={cn(floatingIconButtonVariants(), className)}
						aria-label="Gallery sketch info"
						aria-expanded={open}
						onClick={() => setOpen((value) => !value)}
						onMouseDown={(event) => event.preventDefault()}
					>
						<Info className="h-[14px] w-[14px]" />
					</button>
				</TooltipTrigger>
				<TooltipContent>
					<p>sketch info</p>
				</TooltipContent>
			</Tooltip>

			{open && (
				<div
					ref={panelRef}
					className="fixed right-2 top-9 z-50 w-[min(calc(100vw-1rem),360px)] pointer-events-auto"
				>
					<SketchMetaCard sketch={sketch} showDismiss onDismiss={() => setOpen(false)} />
				</div>
			)}
		</>
	);
}
