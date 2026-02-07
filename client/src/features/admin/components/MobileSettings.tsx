import { XCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { StatusCounts } from '../types';

type MobileSettingsProps = {
    open: boolean;
    token: string;
    reviewerName: string;
    counts: StatusCounts;
    error: string | null;
    onClose: () => void;
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
    error,
    onClose,
    onTokenChange,
    onReviewerNameChange,
    onSave,
}: MobileSettingsProps) {
    if (!open) return null;

    return (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Settings</h2>
                <button type="button" onClick={onClose} className="text-muted-foreground">
                    <XCircle className="h-5 w-5" />
                </button>
            </div>
            <div className="grid gap-3">
                <input
                    type="password"
                    value={token}
                    onChange={(e) => onTokenChange(e.target.value)}
                    placeholder="Admin token"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                    <Button onClick={onSave}>Save & Load</Button>
                    <input
                        type="text"
                        value={reviewerName}
                        onChange={(e) => onReviewerNameChange(e.target.value)}
                        placeholder="Reviewer"
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-amber-500/10 p-2">
                    <p className="text-lg font-bold text-amber-400">{counts.PENDING}</p>
                    <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
                <div className="rounded-md bg-emerald-500/10 p-2">
                    <p className="text-lg font-bold text-emerald-400">{counts.APPROVED}</p>
                    <p className="text-[10px] text-muted-foreground">Approved</p>
                </div>
                <div className="rounded-md bg-rose-500/10 p-2">
                    <p className="text-lg font-bold text-rose-400">{counts.DENIED}</p>
                    <p className="text-[10px] text-muted-foreground">Denied</p>
                </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
