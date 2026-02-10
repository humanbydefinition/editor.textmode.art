import { ScrollArea } from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/cn";
import { Play } from 'lucide-react';
import { useAppStore } from '@/platform/state/appStore';
import { selectStrudelEnabled } from '@/platform/state/selectors';
import type { Example } from '@/types/examples.types';
import { getExampleEngineCatalog } from '../model/exampleCatalog';

export interface ExamplesTabProps {
    onLoadExample: (code: string, engineId: string) => void;
    onClose: () => void;
}

export function ExamplesTab({ onLoadExample, onClose }: ExamplesTabProps) {
    const strudelEnabled = useAppStore(selectStrudelEnabled);

    const engines = getExampleEngineCatalog();

    const handleSelect = (example: Example, engineId: string) => {
        onLoadExample(example.code, engineId);
        onClose();
    };

    if (engines.length === 0) {
        return (
            <div className="p-6 text-center text-zinc-500 italic">
                No examples available.
            </div>
        );
    }

    return (
        <Tabs defaultValue={engines[0]?.id} className="h-full flex flex-col">
            <div className="px-6 py-3 border-b border-white/5 bg-zinc-900/30 shrink-0">
                <TabsList className="bg-transparent p-0 h-auto gap-2 grid grid-cols-2 w-full">
                    {engines.map((engine) => {
                        const isDisabled = engine.id === 'strudel' && !strudelEnabled;
                        const trigger = (
                            <TabsTrigger
                                key={engine.id}
                                value={engine.id}
                                disabled={isDisabled}
                                className={cn(
                                    "bg-zinc-900/50 text-zinc-400 data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/10 data-[state=active]:shadow-none border border-white/5 data-[state=active]:border-emerald-500/20 px-3 py-1.5 h-auto text-xs font-medium uppercase tracking-wider rounded-md transition-all w-full",
                                    isDisabled && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {engine.displayName}
                            </TabsTrigger>
                        );

                        if (isDisabled) {
                            return (
                                <Tooltip key={engine.id}>
                                    <TooltipTrigger asChild>
                                        <div className="w-full">{trigger}</div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="start">
                                        enable strudel in settings first
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return trigger;
                    })}
                </TabsList>
            </div>

            {engines.map((engine) => (
                <TabsContent key={engine.id} value={engine.id} className="flex-1 min-h-0 mt-0">
                    <EngineExampleList
                        engineLabel={engine.displayName}
                        examplesByCategory={engine.examples}
                        onSelect={(ex) => handleSelect(ex, engine.id)}
                    />
                </TabsContent>
            ))}
        </Tabs>
    );
}

function EngineExampleList({
    engineLabel,
    examplesByCategory,
    onSelect,
}: {
    engineLabel: string;
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
                    select an example to load into {engineLabel}. current code will be replaced.
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
