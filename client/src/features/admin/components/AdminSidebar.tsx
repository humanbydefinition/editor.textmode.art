import { Clock, CheckCheck, Ban } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import type { StatusCounts } from '../types';

type AdminSidebarProps = {
    token: string;
    reviewerName: string;
    counts: StatusCounts;
    error: string | null;
    onTokenChange: (value: string) => void;
    onReviewerNameChange: (value: string) => void;
    onSave: () => void;
};

/**
 * Desktop sidebar with access credentials and statistics
 */
export function AdminSidebar({
    token,
    reviewerName,
    counts,
    error,
    onTokenChange,
    onReviewerNameChange,
    onSave,
}: AdminSidebarProps) {
    return (
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-border/50 lg:bg-muted/10">
            <div className="flex flex-col gap-4 p-4 sticky top-14">
                {/* Access Card */}
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                            Access
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Admin token</label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => onTokenChange(e.target.value)}
                                placeholder="Enter token"
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                        <Button className="w-full h-9" onClick={onSave}>
                            Save & Load
                        </Button>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Reviewer name</label>
                            <input
                                type="text"
                                value={reviewerName}
                                onChange={(e) => onReviewerNameChange(e.target.value)}
                                placeholder="admin"
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                        {error && (
                            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Stats Card */}
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                            Statistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 grid gap-2">
                        <div className="flex items-center gap-3 rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5">
                            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                            <span className="text-xs text-muted-foreground flex-1">Pending</span>
                            <span className="text-lg font-semibold text-amber-400 tabular-nums">{counts.PENDING}</span>
                        </div>
                        <div className="flex items-center gap-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                            <CheckCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span className="text-xs text-muted-foreground flex-1">Approved</span>
                            <span className="text-lg font-semibold text-emerald-400 tabular-nums">{counts.APPROVED}</span>
                        </div>
                        <div className="flex items-center gap-3 rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5">
                            <Ban className="h-4 w-4 text-rose-400 shrink-0" />
                            <span className="text-xs text-muted-foreground flex-1">Denied</span>
                            <span className="text-lg font-semibold text-rose-400 tabular-nums">{counts.DENIED}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </aside>
    );
}
