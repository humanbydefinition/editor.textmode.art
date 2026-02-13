import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Loader2, Menu, Shuffle, X, Share, Dices, Pause, Play, Heart } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogClose,
} from '@/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from '@/shared/lib/cn';
import { PreferencesTab } from './tabs/PreferencesTab';
import { AboutTab } from './tabs/AboutTab';
import { LegalTab } from './tabs/LegalTab';
import { ShortcutsTab } from './tabs/ShortcutsTab';

import { useAppStore } from '@/platform/state/appStore';
import { selectSettings } from '@/platform/state/selectors';
import type { StrudelTransportState } from '@/core/app.types';

export interface SystemMenuProps {
    onShare: () => void;
    onRandomize: () => Promise<boolean>;
    onToggleStrudelTransport: () => void;
    onMakeRandomChange?: () => void;
    strudelEnabled: boolean;
    strudelTransport: StrudelTransportState;
    randomizeLoading: boolean;
    onClearStorage: () => void;
    renderExamplesTab: (onClose: () => void) => ReactNode;
}

export function SystemMenu({
    onShare,
    onRandomize,
    onToggleStrudelTransport,
    onMakeRandomChange,
    strudelEnabled,
    strudelTransport,
    randomizeLoading,
    onClearStorage,
    renderExamplesTab,
}: SystemMenuProps) {
    const settings = useAppStore(selectSettings);
    const setSettings = useAppStore((state) => state.setSettings);

    const [open, setOpen] = useState(false);

    const handleRandomize = async () => {
        const success = await onRandomize();
        if (!success) {
            toast.error('failed to load random sketch', {
                position: 'bottom-right',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onToggleStrudelTransport}
                        disabled={!strudelEnabled}
                        onMouseDown={(e) => e.preventDefault()}
                        className={cn(
                            'fixed top-2 right-10 z-50 pointer-events-auto',
                            'flex items-center justify-center',
                            'w-6 h-6 rounded-full',
                            strudelTransport === 'playing'
                                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                                : 'bg-zinc-900/40 border-white/5 text-zinc-400',
                            'backdrop-blur-md border',
                            'transition-all duration-300',
                            'hover:scale-105 hover:bg-zinc-800/60 hover:text-white',
                            'focus:outline-none focus:ring-2 focus:ring-white/10',
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                        )}
                        aria-label={strudelTransport === 'playing' ? 'Pause Strudel audio' : 'Play Strudel audio'}
                    >
                        {strudelTransport === 'playing' ? (
                            <Pause className="w-[14px] h-[14px]" />
                        ) : (
                            <Play className="w-[14px] h-[14px]" />
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>
                        {!strudelEnabled
                            ? 'enable strudel in settings first'
                            : strudelTransport === 'playing'
                                ? 'pause strudel audio'
                                : 'play strudel audio'}
                    </p>
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onMakeRandomChange}
                        onMouseDown={(e) => e.preventDefault()}
                        className={cn(
                            'fixed top-2 right-[6.5rem] z-50 pointer-events-auto',
                            'flex items-center justify-center',
                            'w-6 h-6 rounded-full',
                            'bg-zinc-900/40 backdrop-blur-md',
                            'border border-white/5',
                            'text-zinc-400',
                            'transition-all duration-300',
                            'hover:scale-105 hover:bg-zinc-800/60 hover:text-white',
                            'focus:outline-none focus:ring-2 focus:ring-white/10'
                        )}
                        aria-label="Make random change"
                    >
                        <Dices className="w-[14px] h-[14px]" />
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>make random change</p>
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleRandomize}
                        disabled={randomizeLoading}
                        className={cn(
                            'fixed top-2 right-[4.5rem] z-50 pointer-events-auto',
                            'flex items-center justify-center',
                            'w-6 h-6 rounded-full',
                            'bg-zinc-900/40 backdrop-blur-md',
                            'border border-white/5',
                            'text-zinc-400',
                            'transition-all duration-300',
                            'hover:scale-105 hover:bg-zinc-800/60 hover:text-white',
                            'focus:outline-none focus:ring-2 focus:ring-white/10',
                            'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100'
                        )}
                        aria-label="Load random sketch"
                    >
                        {randomizeLoading ? (
                            <Loader2 className="w-[14px] h-[14px] animate-spin" />
                        ) : (
                            <Shuffle className="w-[14px] h-[14px]" />
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{randomizeLoading ? 'loading random sketch...' : 'load random sketch'}</p>
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <button
                            className={cn(
                                'fixed top-2 right-2 z-50 pointer-events-auto',
                                'flex items-center justify-center',
                                'w-6 h-6 rounded-full',
                                'bg-zinc-900/40 backdrop-blur-md',
                                'border border-white/5',
                                'text-zinc-400',
                                'transition-all duration-300',
                                'hover:scale-105 hover:bg-zinc-800/60 hover:text-white',
                                'focus:outline-none focus:ring-2 focus:ring-white/10'
                            )}
                            aria-label="System Menu"
                        >
                            <Menu className="w-[14px] h-[14px]" />
                        </button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>system menu</p>
                </TooltipContent>
            </Tooltip>

            <DialogContent showCloseButton={false} className="sm:max-w-[600px] h-[85vh] sm:h-[600px] bg-zinc-950/95 backdrop-blur-2xl border-white/10 p-0 overflow-hidden flex flex-col">
                <DialogDescription className="sr-only">
                    System Menu containing settings, shortcuts, about information, and legal documents.
                </DialogDescription>
                <DialogHeader className="px-6 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-1">
                            <DialogTitle className="text-l font-bold tracking-tight text-white flex items-center gap-2">
                                synth.textmode.art
                            </DialogTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <a
                                        href="https://code.textmode.art/docs/support"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-pink-400 hover:bg-pink-500/10 transition-all"
                                        aria-label="Support the project"
                                    >
                                        <Heart className="w-4 h-4" />
                                    </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>support the project</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            onShare();
                                        }}
                                        className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                                        aria-label="Share sketch"
                                    >
                                        <Share className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>share sketch</p>
                                </TooltipContent>
                            </Tooltip>
                            <DialogClose className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
                                <X className="w-4 h-4" />
                                <span className="sr-only">Close</span>
                            </DialogClose>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="settings" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-2 shrink-0 relative">
                        {/* Scroll indicator gradient on the right */}
                        <div className="absolute right-6 top-2 bottom-0 w-8 bg-gradient-to-l from-zinc-950/80 to-transparent pointer-events-none z-10 sm:hidden" />
                        <TabsList className="flex w-full justify-start bg-zinc-900/50 p-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                            <TabsTrigger value="settings" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">settings</TabsTrigger>
                            <TabsTrigger value="examples" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">examples</TabsTrigger>
                            <TabsTrigger value="shortcuts" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">controls</TabsTrigger>
                            <TabsTrigger value="about" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">about</TabsTrigger>
                            <TabsTrigger value="legal" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">legal</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="settings" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <PreferencesTab
                            settings={settings}
                            onSettingsChange={setSettings}
                            onClearStorage={onClearStorage}
                            onClose={() => setOpen(false)}
                        />
                    </TabsContent>

                    <TabsContent value="examples" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        {renderExamplesTab(() => setOpen(false))}
                    </TabsContent>

                    <TabsContent value="shortcuts" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <ShortcutsTab />
                    </TabsContent>

                    <TabsContent value="about" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <AboutTab />
                    </TabsContent>

                    <TabsContent value="legal" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <LegalTab />
                    </TabsContent>
                </Tabs>

                <div className="border-t border-white/5 bg-zinc-950/50 shrink-0 relative">
                    {/* Scroll indicator gradient on the right */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none z-10 sm:hidden" />

                    <div className="p-4 overflow-x-auto scrollbar-hide">
                        <div className="flex items-center gap-6 whitespace-nowrap min-w-max px-2">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <span>run code</span>
                                <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-white/5">Ctrl+Enter</span>
                            </div>


                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <span>toggle audio</span>
                                <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-white/5">Ctrl+.</span>
                            </div>


                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <span>reset sketch</span>
                                <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-white/5">Ctrl+Shift+R</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
