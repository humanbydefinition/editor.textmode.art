import { useCallback, type KeyboardEvent } from 'react';
import type { ExampleLibraryCatalog, ExampleLibraryId } from '@/features/examples/types';
import { LibrarySidebarItem } from './LibrarySidebarItem';

export interface LibrarySidebarProps {
	libraries: ExampleLibraryCatalog[];
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
				<LibrarySidebarItem
					key={library.id}
					id={library.id}
					label={library.displayName}
					isActive={library.id === selectedId}
					onSelect={onSelect}
					onKeyDown={(e) => handleKeyDown(e, index)}
					tabIndex={library.id === selectedId ? 0 : -1}
					panelId={`examples-panel-${library.id}`}
					className={index < 3 ? 'min-[420px]:col-span-2' : 'min-[420px]:col-span-3'}
				/>
			))}
		</div>
	);
}
