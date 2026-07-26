import { useCallback, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import type { ExampleLibraryCatalog, ExampleLibraryId } from '@/features/examples/types';

interface LibrarySidebarProps {
	libraries: readonly ExampleLibraryCatalog[];
	selectedId: ExampleLibraryId;
	onSelect: (id: ExampleLibraryId) => void;
}

export function LibrarySidebar({ libraries, selectedId, onSelect }: LibrarySidebarProps) {
	const handleKeyDown = useCallback(
		(e: KeyboardEvent, index: number) => {
			let nextIndex: number | null = null;

			if (e.key === 'ArrowLeft') {
				nextIndex = index === 0 ? libraries.length - 1 : index - 1;
			} else if (e.key === 'ArrowRight') {
				nextIndex = index === libraries.length - 1 ? 0 : index + 1;
			} else if (e.key === 'Home') {
				nextIndex = 0;
			} else if (e.key === 'End') {
				nextIndex = libraries.length - 1;
			}

			if (nextIndex !== null) {
				e.preventDefault();
				onSelect(libraries[nextIndex].id);
				requestAnimationFrame(() => {
					document.getElementById(`tab-${libraries[nextIndex].id}`)?.focus();
				});
			}
		},
		[libraries, onSelect]
	);

	return (
		<div
			role="tablist"
			aria-label="Example libraries"
			aria-orientation="horizontal"
			className="grid shrink-0 grid-cols-1 gap-1.5 border-b border-white/5 px-4 py-3 min-[420px]:grid-cols-6 sm:px-6"
		>
			{libraries.map((library, index) => (
				<button
					key={library.id}
					role="tab"
					aria-selected={library.id === selectedId}
					aria-controls={`examples-panel-${library.id}`}
					id={`tab-${library.id}`}
					tabIndex={library.id === selectedId ? 0 : -1}
					onClick={() => onSelect(library.id)}
					onKeyDown={(e) => handleKeyDown(e, index)}
					className={cn(
						'flex min-h-8 w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-center text-xs font-medium whitespace-nowrap transition-colors',
						'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70',
						library.id === selectedId
							? 'bg-zinc-800 text-white'
							: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
						index < 3 ? 'min-[420px]:col-span-2' : 'min-[420px]:col-span-3'
					)}
				>
					{library.displayName}
				</button>
			))}
		</div>
	);
}
