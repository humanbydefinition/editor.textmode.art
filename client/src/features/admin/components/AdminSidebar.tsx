import { Clock, CheckCheck, Ban } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';
import type { StatusCounts } from '../types';

type AdminSidebarProps = {
    token: string;
    reviewerName: string;
    counts: StatusCounts;
    loading: boolean;
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
    loading,
    error,
    onTokenChange,
    onReviewerNameChange,
    onSave,
}: AdminSidebarProps) {
    return (
        <aside className="hidden lg:block lg:w-[320px] lg:flex-none">
            <div className="sticky top-20 space-y-4 px-4 pb-8">
                <Card className="border-border/70 bg-card/70 backdrop-blur motion-safe:animate-in motion-safe:slide-in-from-left-2 motion-safe:fade-in-0">
                    <CardHeader className="space-y-1 pb-2">
                        <CardTitle className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
                            Access Control
                        </CardTitle>
                        <CardDescription>Authenticate once, then moderate quickly.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="admin-token">Admin token</Label>
                            <Input
                                id="admin-token"
                                name="admin-token"
                                type="password"
                                autoComplete="off"
                                value={token}
                                onChange={(e) => onTokenChange(e.target.value)}
                                placeholder="Enter token"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reviewer-name">Reviewer name</Label>
                            <Input
                                id="reviewer-name"
                                name="reviewer-name"
                                type="text"
                                autoComplete="nickname"
                                value={reviewerName}
                                onChange={(e) => onReviewerNameChange(e.target.value)}
                                placeholder="admin"
                            />
                        </div>

                        <Button className="w-full" onClick={onSave} disabled={loading}>
                            {loading ? 'Syncing...' : 'Save & Sync Queue'}
                        </Button>

                        {error && (
                            <Alert aria-live="polite" className="border-destructive/30 bg-destructive/10 py-3">
                                <AlertDescription className="text-xs text-destructive">{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/70 backdrop-blur motion-safe:animate-in motion-safe:slide-in-from-left-2 motion-safe:fade-in-0 motion-safe:delay-100">
                    <CardHeader className="space-y-1 pb-2">
                        <CardTitle className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
                            Queue Stats
                        </CardTitle>
                        <CardDescription>Live moderation snapshot.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5">
                            <Clock className="h-4 w-4 shrink-0 text-amber-300" />
                            <span className="flex-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                Pending
                            </span>
                            <span className="text-lg font-semibold tabular-nums text-amber-200">{counts.PENDING}</span>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5">
                            <CheckCheck className="h-4 w-4 shrink-0 text-emerald-300" />
                            <span className="flex-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                Approved
                            </span>
                            <span className="text-lg font-semibold tabular-nums text-emerald-200">{counts.APPROVED}</span>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2.5">
                            <Ban className="h-4 w-4 shrink-0 text-rose-300" />
                            <span className="flex-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                Denied
                            </span>
                            <span className="text-lg font-semibold tabular-nums text-rose-200">{counts.DENIED}</span>
                        </div>

                        <Separator />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Total processed</span>
                            <span className="font-semibold tabular-nums">{counts.all}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </aside>
    );
}
