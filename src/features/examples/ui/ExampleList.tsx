import { Play } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Separator } from '@/shared/ui/separator';
import type { ExampleLibraryCatalog, Example } from '@/features/examples/types';

interface ExampleListProps {
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
								<div key={category.id}>
									{index > 0 && <Separator className="mb-5 bg-white/5" />}
									<div className="space-y-3">
										<h3 className="border-l-2 border-zinc-700 pl-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
											{category.displayName}
										</h3>
										<div className="grid grid-cols-1 gap-2.5">
											{category.examples.map((example) => (
												<button
													key={example.id}
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
											))}
										</div>
									</div>
								</div>
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
