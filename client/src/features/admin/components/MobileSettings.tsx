import { Ban, CheckCheck, Clock, Settings2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/alert';
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
    token: string;
    reviewerName: string;
    counts: StatusCounts;
    loading: boolean;
    error: string | null;
    onOpenChange: (open: boolean) => void;
    onTokenChange: (value: string) => void;
    onReviewerNameChange: (value: string) => void;
    onSave: () => void;
};

/**
 * Mobile bottom sheet with settings and statistics
 */
export function MobileSettings({
    open,
    token,
    reviewerName,
    counts,
    loading,
    error,
    onOpenChange,
    onTokenChange,
    onReviewerNameChange,
    onSave,
}: MobileSettingsProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="top-auto bottom-0 translate-x-[-50%] translate-y-0 rounded-b-none rounded-t-2xl border-border/70 p-0 pb-[max(env(safe-area-inset-bottom),1rem)] sm:max-w-[560px]"
            >
                <DialogHeader className="border-b border-border/70 px-5 pt-5 pb-4">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Settings2 className="h-4 w-4 text-primary" />
                        Moderation Settings
                    </DialogTitle>
                    <DialogDescription>Manage credentials and monitor queue health.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-5 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="mobile-admin-token">Admin token</Label>
                        <Input
                            id="mobile-admin-token"
                            name="mobile-admin-token"
                            type="password"
                            autoComplete="off"
                            value={token}
                            onChange={(e) => onTokenChange(e.target.value)}
                            placeholder="Enter token"
                        />
                    </div>

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
                        />
                    </div>

                    <Button onClick={onSave} className="w-full" disabled={loading}>
                        {loading ? 'Syncing...' : 'Save & Sync Queue'}
                    </Button>

                    {error && (
                        <Alert aria-live="polite" className="border-destructive/30 bg-destructive/10 py-3">
                            <AlertDescription className="text-xs text-destructive">{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <div className="px-5 pb-2">
                    <Separator />
                </div>

                <div className="grid grid-cols-3 gap-2 px-5 pb-4 text-center">
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                        <Clock className="mx-auto h-4 w-4 text-amber-300" />
                        <p className="mt-1 text-lg font-bold tabular-nums text-amber-200">{counts.PENDING}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Pending</p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                        <CheckCheck className="mx-auto h-4 w-4 text-emerald-300" />
                        <p className="mt-1 text-lg font-bold tabular-nums text-emerald-200">{counts.APPROVED}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Approved</p>
                    </div>
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5">
                        <Ban className="mx-auto h-4 w-4 text-rose-300" />
                        <p className="mt-1 text-lg font-bold tabular-nums text-rose-200">{counts.DENIED}</p>
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
