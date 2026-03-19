import { ScrollArea } from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";
import { Play } from 'lucide-react';
import type { Example } from '@/features/examples/types';
import { getExampleEngineCatalog } from '../model/exampleCatalog';

export interface ExamplesTabProps {
    onLoadExample: (code: string, engineId: string) => void;
    onClose: () => void;
}

export function ExamplesTab({ onLoadExample, onClose }: ExamplesTabProps) {
    const engines = getExampleEngineCatalog();
    const engine = engines[0];

    const handleSelect = (example: Example) => {
        onLoadExample(example.code, engine.id);
        onClose();
    };

    if (!engine) {
        return (
            <div className="p-6 text-center text-zinc-500 italic">
                No examples available.
            </div>
        );
    }

    return (
        <EngineExampleList
            examplesByCategory={engine.examples}
            onSelect={handleSelect}
        />
    );
}

function EngineExampleList({
    examplesByCategory,
    onSelect,
}: {
    examplesByCategory: Record<string, Example[]>;
    onSelect: (ex: Example) => void;
}) {
    const categories = Object.keys(examplesByCategory);

    // Simple helper to capitalize category names
    const getCategoryName = (cat: string) => cat.charAt(0).toUpperCase() + cat.slice(1);

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                <p className="text-sm text-zinc-400">
                    select an example to load. your current code will be replaced.
                </p>

                {categories.map((category, index) => (
                    <div key={category}>
                        {index > 0 && <Separator className="bg-white/5 mb-6" />}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider pl-1 border-l-2 border-zinc-700">
                                {getCategoryName(category)}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {examplesByCategory[category]?.map((example) => (
                                    <button
                                        key={example.id}
                                        onClick={() => onSelect(example)}
                                        className="flex items-start gap-4 p-4 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group text-left w-full"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                                            <Play className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                                                {example.name}
                                            </h4>
                                            <p className="text-xs text-zinc-500 group-hover:text-zinc-400 mt-1 line-clamp-2">
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
