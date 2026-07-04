import { ScrollArea } from '@/shared/ui/scroll-area';
import { ExampleCategorySection } from './ExampleCategorySection';
import type { ExampleLibraryCatalog, Example } from '@/features/examples/types';

export interface ExampleListProps {
	library: ExampleLibraryCatalog;
	onSelect: (example: Example) => void;
}

export function ExampleList({ library, onSelect }: ExampleListProps) {
	const hasExamples = library.categories.some((category) => category.examples.length > 0);

	return (
		<div
			role="tabpanel"
			aria-labelledby={`tab-${library.id}`}
			id={`examples-panel-${library.id}`}
			className="flex min-h-0 min-w-0 flex-1 flex-col"
		>
			<div className="sticky top-0 z-10 border-b border-white/5 bg-zinc-950/95 px-4 py-4 backdrop-blur-sm sm:px-6">
				<p className="mx-auto w-full max-w-3xl text-xs text-zinc-400">
					{hasExamples
						? 'select an example to load. your current code will be replaced.'
						: 'example sketches are currently available only for textmode.synth.js.'}
				</p>
			</div>
			<div className="min-h-0 flex-1">
				<ScrollArea className="h-full" key={library.id}>
					<div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">
						{hasExamples ? (
							library.categories.map((category, index) => (
								<ExampleCategorySection
									key={category.id}
									category={category}
									index={index}
									onSelect={onSelect}
								/>
							))
						) : (
							<EmptyLibraryState libraryName={library.displayName} />
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}

function EmptyLibraryState({ libraryName }: { libraryName: string }) {
	return (
		<div className="rounded-lg border border-dashed border-white/10 bg-zinc-900/25 px-4 py-5 sm:px-5">
			<h3 className="text-sm font-medium text-zinc-200">No {libraryName} examples yet</h3>
			<p className="mt-2 text-xs leading-5 text-zinc-500">
				This library group is kept here for navigation and future examples.
			</p>
		</div>
	);
}
