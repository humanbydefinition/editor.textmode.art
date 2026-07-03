import { Play } from 'lucide-react';
import { getExampleLibraryCatalog } from '@/features/examples/model/exampleCatalog';
import type { Example, ExampleCategory } from '@/features/examples/types';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Separator } from '@/shared/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

export interface ExamplesTabProps {
	onLoadExample: (code: string) => void;
	onClose: () => void;
}

export function ExamplesTab({ onLoadExample, onClose }: ExamplesTabProps) {
	const libraries = getExampleLibraryCatalog();
	const defaultLibrary = libraries[0]?.id;

	const handleSelect = (example: Example) => {
		onLoadExample(example.code);
		onClose();
	};

	if (!defaultLibrary) {
		return <div className="p-6 text-center text-zinc-500 italic">No examples available.</div>;
	}

	return (
		<Tabs defaultValue={defaultLibrary} className="h-full min-h-0 gap-0">
			<div className="border-b border-white/5 px-6 py-4">
				<div className="overflow-x-auto">
					<TabsList
						aria-label="Example libraries"
						className="h-auto w-max justify-start gap-1 rounded-md border border-white/5 bg-zinc-950/60 p-1"
					>
						{libraries.map((library) => (
							<TabsTrigger
								key={library.id}
								value={library.id}
								className="min-h-8 flex-none rounded px-3 text-xs text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
							>
								{library.displayName}
							</TabsTrigger>
						))}
					</TabsList>
				</div>
			</div>

			{libraries.map((library) => (
				<TabsContent key={library.id} value={library.id} className="min-h-0 flex-1">
					<LibraryExampleList categories={library.categories} onSelect={handleSelect} />
				</TabsContent>
			))}
		</Tabs>
	);
}

function LibraryExampleList({
	categories,
	onSelect,
}: {
	categories: ExampleCategory[];
	onSelect: (ex: Example) => void;
}) {
	return (
		<ScrollArea className="h-full">
			<div className="space-y-6 p-6">
				<p className="text-sm text-zinc-400">select an example to load. your current code will be replaced.</p>

				{categories.map((category, index) => (
					<div key={category.id}>
						{index > 0 && <Separator className="mb-6 bg-white/5" />}
						<div className="space-y-4">
							<h3 className="border-l-2 border-zinc-700 pl-1 text-sm font-medium uppercase tracking-wider text-zinc-400">
								{category.displayName}
							</h3>
							<div className="grid grid-cols-1 gap-3">
								{category.examples.map((example) => (
									<button
										key={example.id}
										type="button"
										aria-label={`Load ${example.name}`}
										onClick={() => onSelect(example)}
										className="group flex w-full items-start gap-4 rounded-lg border border-white/5 bg-zinc-900/30 p-4 text-left transition-all hover:border-white/10 hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
									>
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
											<Play className="h-5 w-5" />
										</div>
										<div className="min-w-0 flex-1">
											<h4 className="text-sm font-medium text-zinc-200 transition-colors group-hover:text-white">
												{example.name}
											</h4>
											<p className="mt-1 line-clamp-2 text-xs text-zinc-500 group-hover:text-zinc-400">
												{example.description}
											</p>
										</div>
									</button>
								))}
							</div>
						</div>
					</div>
				))}
			</div>
		</ScrollArea>
	);
}
