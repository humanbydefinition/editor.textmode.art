import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Menu, Shuffle, X, Share, Dices, Heart } from 'lucide-react';
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
import { APP_META, buildLegalHref } from '@/shared/config/appMeta';
import { floatingIconButtonVariants } from '@/shared/ui/floating-icon-button';
import { PreferencesTab } from './tabs/PreferencesTab';
import { AboutTab } from './tabs/AboutTab';
import { ShortcutsTab } from './tabs/ShortcutsTab';
import { AudioTab } from './tabs/AudioTab';

import { useAppStore } from '@/platform/state/appStore';
import { selectSettings } from '@/platform/state/selectors';
import type { AudioInputState } from '@/platform/state/slices/audioSlice';

export interface SystemMenuProps {
    onShare: () => void;
    onRandomize: () => boolean;
    onMakeRandomChange?: () => void;
    onResetRunners: () => void;
    onClearStorage: () => void;
    audioInput: AudioInputState;
    onEnableAudioInput: (deviceId?: string) => Promise<void>;
    onDisableAudioInput: () => void;
    onRefreshAudioInputDevices: () => Promise<void>;
    onSelectAudioInputDevice: (deviceId: string) => Promise<void>;
    renderExamplesTab: (onClose: () => void) => ReactNode;
}

export function SystemMenu({
    onShare,
    onRandomize,
    onMakeRandomChange,
    onResetRunners,
    onClearStorage,
    audioInput,
    onEnableAudioInput,
    onDisableAudioInput,
    onRefreshAudioInputDevices,
    onSelectAudioInputDevice,
    renderExamplesTab,
}: SystemMenuProps) {
    const currentYear = new Date().getFullYear();
    const settings = useAppStore(selectSettings);
    const updateSettings = useAppStore((state) => state.updateSettings);

    const [open, setOpen] = useState(false);

    const handleRandomize = () => {
        const success = onRandomize();
        if (!success) {
            toast.error('no gallery sketches available', {
                position: 'bottom-right',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onMakeRandomChange}
                        onMouseDown={(e) => e.preventDefault()}
                        className={`${floatingIconButtonVariants()} fixed top-2 right-[4.5rem] z-50 pointer-events-auto`}
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
                        className={`${floatingIconButtonVariants()} fixed top-2 right-[2.5rem] z-50 pointer-events-auto`}
                        aria-label="Load random sketch"
                    >
                        <Shuffle className="w-[14px] h-[14px]" />
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>load random sketch</p>
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <button
                            className={`${floatingIconButtonVariants()} fixed top-2 right-2 z-50 pointer-events-auto`}
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

            <DialogContent
                showCloseButton={false}
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    const content = event.currentTarget as HTMLElement | null;
                    content?.focus();
                }}
                className="sm:max-w-[600px] h-[85vh] sm:h-[600px] bg-zinc-950/95 backdrop-blur-2xl border-white/10 p-0 overflow-hidden flex flex-col"
            >
                <DialogDescription className="sr-only">
                    System Menu containing settings, shortcuts, about information, and external legal links.
                </DialogDescription>
                <DialogHeader className="px-6 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-1">
                            <DialogTitle className="text-l font-bold tracking-tight text-white flex items-center gap-2">
                                {APP_META.name}
                            </DialogTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <a
                                        href={APP_META.urls.support}
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
                            <TabsTrigger value="audio" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">audio</TabsTrigger>
                            <TabsTrigger value="examples" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">examples</TabsTrigger>
                            <TabsTrigger value="shortcuts" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">controls</TabsTrigger>
                            <TabsTrigger value="about" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">about</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="settings" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <PreferencesTab
                            settings={settings}
                            onSettingsChange={updateSettings}
                            onResetRunners={onResetRunners}
                            onClearStorage={onClearStorage}
                            onClose={() => setOpen(false)}
                        />
                    </TabsContent>

                    <TabsContent value="audio" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <AudioTab
                            audioInput={audioInput}
                            onEnable={onEnableAudioInput}
                            onDisable={onDisableAudioInput}
                            onRefreshDevices={onRefreshAudioInputDevices}
                            onSelectDevice={onSelectAudioInputDevice}
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
                </Tabs>

                <div className="border-t border-white/5 bg-zinc-950/50 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-[11px] text-zinc-500">
                        <span className="whitespace-nowrap">textmode.art (c) {currentYear}</span>
                        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-right">
                            <a
                                href={buildLegalHref('imprint')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-colors hover:text-zinc-300"
                            >
                                imprint
                            </a>
                            <a
                                href={buildLegalHref('terms')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-colors hover:text-zinc-300"
                            >
                                terms
                            </a>
                            <a
                                href={buildLegalHref('privacy')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-colors hover:text-zinc-300"
                            >
                                privacy
                            </a>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
