import { Play } from 'lucide-react';
import type { Example } from '@/features/examples/types';

export interface ExampleCardProps {
	example: Example;
	onSelect: (example: Example) => void;
}

export function ExampleCard({ example, onSelect }: ExampleCardProps) {
	return (
		<button
			type="button"
			aria-label={`Load ${example.name}`}
			onClick={() => onSelect(example)}
			className="group flex w-full items-start gap-3 rounded-lg border border-white/5 bg-zinc-900/30 p-3.5 text-left transition-all hover:border-white/10 hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 sm:p-4"
		>
			<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
				<Play className="h-4 w-4" />
			</div>
			<div className="min-w-0 flex-1">
				<h4 className="text-sm font-medium leading-5 text-zinc-200 transition-colors group-hover:text-white">
					{example.name}
				</h4>
				<p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 group-hover:text-zinc-400">
					{example.description}
				</p>
			</div>
		</button>
	);
}
