import { Ban, CheckCheck, Clock, Settings2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';
import type { StatusCounts } from '../types';

type MobileSettingsProps = {
    open: boolean;
    reviewerName: string;
    counts: StatusCounts;
    onOpenChange: (open: boolean) => void;
    onReviewerNameChange: (value: string) => void;
    onSignOut: () => void;
};

/**
 * Mobile bottom sheet with settings and statistics
 */
export function MobileSettings({
    open,
    reviewerName,
    counts,
    onOpenChange,
    onReviewerNameChange,
    onSignOut,
}: MobileSettingsProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="top-auto bottom-0 translate-x-[-50%] translate-y-0 rounded-none border-2 border-border p-0 pb-[max(env(safe-area-inset-bottom),1rem)] sm:max-w-[560px]"
            >
                <DialogHeader className="border-b-2 border-border px-5 pt-5 pb-4">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Settings2 className="h-4 w-4 text-primary" />
                        Moderation Settings
                    </DialogTitle>
                    <DialogDescription>Manage reviewer identity and active session.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-5 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="mobile-reviewer">Reviewer name</Label>
                        <Input
                            id="mobile-reviewer"
                            name="mobile-reviewer"
                            type="text"
                            autoComplete="nickname"
                            value={reviewerName}
                            onChange={(e) => onReviewerNameChange(e.target.value)}
                            placeholder="admin"
                            className="h-10 rounded-none border-2 border-input bg-background"
                        />
                    </div>

                    <Button onClick={onSignOut} variant="outline" className="h-10 w-full rounded-none border-2 border-border">
                        Sign out
                    </Button>
                </div>

                <div className="px-5 pb-2">
                    <Separator />
                </div>

                <div className="grid grid-cols-3 gap-2 px-5 pb-4 text-center">
                    <div className="border-2 border-border bg-background p-2.5">
                        <Clock className="mx-auto h-4 w-4 text-muted-foreground" />
                        <p className="mt-1 text-lg font-bold tabular-nums">{counts.PENDING}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Pending</p>
                    </div>
                    <div className="border-2 border-border bg-background p-2.5">
                        <CheckCheck className="mx-auto h-4 w-4 text-muted-foreground" />
                        <p className="mt-1 text-lg font-bold tabular-nums">{counts.APPROVED}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Approved</p>
                    </div>
                    <div className="border-2 border-border bg-background p-2.5">
                        <Ban className="mx-auto h-4 w-4 text-muted-foreground" />
                        <p className="mt-1 text-lg font-bold tabular-nums">{counts.DENIED}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Denied</p>
                    </div>
                </div>

                <div className="px-5 pb-5 text-center text-xs text-muted-foreground">
                    Total requests: <span className="font-semibold tabular-nums">{counts.all}</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
