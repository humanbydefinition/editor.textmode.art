import { Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface PublishRequestSuccessDialogProps {
    open: boolean;
    submittedSlug: string | null;
    onOpenChange: (open: boolean) => void;
}

export function PublishRequestSuccessDialog({
    open,
    submittedSlug,
    onOpenChange,
}: PublishRequestSuccessDialogProps) {
    const slug = submittedSlug || 'your-sketch';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] bg-zinc-950/98 backdrop-blur-2xl border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-400" />
                        request submitted
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-400">
                        your sketch is pending review
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-sm text-zinc-300">
                            your publish request for{' '}
                            <span className="font-mono text-emerald-300">/s/{slug}</span>{' '}
                            has been submitted for moderation.
                        </p>
                        <p className="text-xs text-zinc-500 mt-2">
                            once approved, your sketch will appear in the community gallery and be
                            discoverable via the randomize feature. it will also be live at its own
                            SEO-friendly URL.
                        </p>
                    </div>

                    <Button
                        className="w-full bg-zinc-800 border border-white/10 text-zinc-200 hover:bg-zinc-700"
                        onClick={() => onOpenChange(false)}
                    >
                        close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
