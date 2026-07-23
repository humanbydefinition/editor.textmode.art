import { Separator } from '@/shared/ui/separator';
import { ExampleCard } from './ExampleCard';
import type { ExampleCategory, Example } from '@/features/examples/types';

interface ExampleCategorySectionProps {
	category: ExampleCategory;
	index: number;
	onSelect: (example: Example) => void;
}

export function ExampleCategorySection({ category, index, onSelect }: ExampleCategorySectionProps) {
	return (
		<div>
			{index > 0 && <Separator className="mb-5 bg-white/5" />}
			<div className="space-y-3">
				<h3 className="border-l-2 border-zinc-700 pl-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
					{category.displayName}
				</h3>
				<div className="grid grid-cols-1 gap-2.5">
					{category.examples.map((example) => (
						<ExampleCard key={example.id} example={example} onSelect={onSelect} />
					))}
				</div>
			</div>
		</div>
	);
}
