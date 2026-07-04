import { cn } from '@/shared/lib/cn';
import type { KeyboardEvent } from 'react';
import type { ExampleLibraryId } from '@/features/examples/types';

export interface LibrarySidebarItemProps {
	id: ExampleLibraryId;
	label: string;
	isActive: boolean;
	onSelect: (id: ExampleLibraryId) => void;
	onKeyDown: (e: KeyboardEvent) => void;
	tabIndex: number;
	panelId: string;
}

export function LibrarySidebarItem({
	id,
	label,
	isActive,
	onSelect,
	onKeyDown,
	tabIndex,
	panelId,
}: LibrarySidebarItemProps) {
	return (
		<button
			role="tab"
			aria-selected={isActive}
			aria-controls={panelId}
			id={`tab-${id}`}
			tabIndex={tabIndex}
			onClick={() => onSelect(id)}
			onKeyDown={onKeyDown}
			className={cn(
				'flex min-h-8 flex-none items-center gap-2 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70',
				isActive
					? 'bg-zinc-800 text-white'
					: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
			)}
		>
			{label}
		</button>
	);
}
