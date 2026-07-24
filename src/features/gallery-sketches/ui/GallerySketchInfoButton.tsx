import { useEffect, useRef, useState } from 'react';
import { Info, Share2 } from 'lucide-react';
import { FloatingActionButton } from '@/shared/ui/floating-action-button';
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
			<FloatingActionButton
				className={className}
				aria-label="Share sketch"
				onClick={onShare}
				onMouseDown={(event) => event.preventDefault()}
				tooltip="share sketch"
			>
				<Share2 className="h-[14px] w-[14px]" />
			</FloatingActionButton>
		);
	}

	return (
		<>
			<FloatingActionButton
				ref={buttonRef}
				className={className}
				aria-label="Gallery sketch info"
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
				onMouseDown={(event) => event.preventDefault()}
				tooltip="sketch info"
			>
				<Info className="h-[14px] w-[14px]" />
			</FloatingActionButton>

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
