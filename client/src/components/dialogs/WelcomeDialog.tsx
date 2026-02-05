import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';

const WELCOME_DISMISSED_KEY = 'textmode_welcome_dismissed';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface WelcomeDialogProps {
    onOpenChange?: (isOpen: boolean) => void;
}

export function WelcomeDialog({ onOpenChange }: WelcomeDialogProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const dismissedAt = localStorage.getItem(WELCOME_DISMISSED_KEY);
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            const now = Date.now();
            // If less than 7 days have passed, don't show
            if (now - dismissedTime < SEVEN_DAYS_MS) {
                onOpenChange?.(false);
                return;
            }
        }
        // Show modal
        setOpen(true);
        onOpenChange?.(true);
    }, [onOpenChange]);

    const handleClose = () => {
        localStorage.setItem(WELCOME_DISMISSED_KEY, Date.now().toString());
        setOpen(false);
        onOpenChange?.(false);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) handleClose();
        }}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-[480px] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden"
                overlayClassName="bg-black/90 backdrop-blur-lg"
            >
                <DialogHeader className="px-6 py-4 border-b border-white/5 text-left">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-1">
                            <DialogTitle className="text-l font-bold tracking-tight text-white flex items-center gap-2">
                                synth.textmode.art
                            </DialogTitle>
                            <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-mono text-[10px] tracking-wider uppercase relative -top-2">
                                Beta
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1">

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <a
                                        href="https://discord.gg/sjrw8QXNks"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                                    >
                                        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current">
                                            <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
                                        </svg>
                                    </a>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>join our discord</p>
                                </TooltipContent>
                            </Tooltip>

                            <DialogClose
                                onClick={handleClose}
                                className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                            >
                                <X className="w-4 h-4" />
                                <span className="sr-only">Close</span>
                            </DialogClose>
                        </div>
                    </div>
                    <DialogDescription className="text-sm text-zinc-400">
                        live coding environment for ascii synthesis. create procedural and generative text art with textmode.js.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-5">
                    {/* Photosensitivity Warning */}
                    <div className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-amber-300">
                                photosensitivity warning
                            </h4>
                            <p className="text-xs text-amber-200/70 leading-relaxed">
                                this application displays rapidly changing visual patterns, flashing lights, and strobing effects
                                that may potentially trigger seizures in individuals with photosensitive epilepsy or other
                                photosensitivity conditions. viewer discretion is advised.
                            </p>
                        </div>
                    </div>

                    {/* Quick tips */}
                    <div className="text-xs text-zinc-500 space-y-1.5">
                        <p>
                            <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">Ctrl+Enter</span>
                            {' '}to run your code
                        </p>
                        <p>
                            <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">Ctrl+Shift+R</span>
                            {' '}to reset the sketch
                        </p>
                    </div>

                    {/* Continue Button */}
                    <button
                        onClick={handleClose}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-white/10 text-sm text-zinc-300 hover:text-white transition-all"
                    >
                        continue
                    </button>

                    {/* License info */}
                    <div className="text-right">
                        <a
                            href="https://github.com/humanbydefinition/synth.textmode.art/blob/main/LICENSE"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                            licensed under GNU AGPLv3
                        </a>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
