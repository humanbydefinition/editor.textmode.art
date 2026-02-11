import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Clock, AlertCircle } from 'lucide-react';

export interface SubmissionsPausedDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SubmissionsPausedDialog({
    open,
    onOpenChange,
}: SubmissionsPausedDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-white/5 text-left shrink-0">
                    <DialogTitle className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" />
                        submissions paused
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-400">
                        the gallery submission queue is currently full.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-4">
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm text-zinc-200 font-medium">
                                high volume of submissions
                            </p>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                to ensure a quality review for everyone, new submissions are temporarily paused.
                                <br /><br />
                                please check back later.
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-zinc-500">
                        thank you for your patience and understanding!
                    </p>

                    <Button
                        className="w-full bg-zinc-800 border border-white/5 text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all"
                        onClick={() => onOpenChange(false)}
                    >
                        close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
