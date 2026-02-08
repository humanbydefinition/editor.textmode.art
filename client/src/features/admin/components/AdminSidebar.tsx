import { Clock, CheckCheck, Ban } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';
import type { StatusCounts } from '../types';

type AdminSidebarProps = {
    reviewerName: string;
    counts: StatusCounts;
    onReviewerNameChange: (value: string) => void;
    onSignOut: () => void;
};

/**
 * Desktop sidebar with reviewer profile and statistics
 */
export function AdminSidebar({
    reviewerName,
    counts,
    onReviewerNameChange,
    onSignOut,
}: AdminSidebarProps) {
    return (
        <aside className="hidden lg:block lg:w-[320px] lg:flex-none">
            <div className="sticky top-20 space-y-4 px-4 pb-8">
                <Card className="rounded-none border-2 border-border bg-card shadow-none">
                    <CardHeader className="space-y-1 pb-2">
                        <CardTitle className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
                            Reviewer Session
                        </CardTitle>
                        <CardDescription>Manage your reviewer identity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                className="h-10 rounded-none border-2 border-input bg-background"
                            />
                        </div>

                        <Button variant="outline" className="h-10 w-full rounded-none border-2 border-border" onClick={onSignOut}>
                            Sign out
                        </Button>
                    </CardContent>
                </Card>

                <Card className="rounded-none border-2 border-border bg-card shadow-none">
                    <CardHeader className="space-y-1 pb-2">
                        <CardTitle className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
                            Queue Stats
                        </CardTitle>
                        <CardDescription>Live moderation snapshot.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-3 border-2 border-border bg-background px-3 py-2.5">
                            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                Pending
                            </span>
                            <span className="text-lg font-semibold tabular-nums">{counts.PENDING}</span>
                        </div>
                        <div className="flex items-center gap-3 border-2 border-border bg-background px-3 py-2.5">
                            <CheckCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                Approved
                            </span>
                            <span className="text-lg font-semibold tabular-nums">{counts.APPROVED}</span>
                        </div>
                        <div className="flex items-center gap-3 border-2 border-border bg-background px-3 py-2.5">
                            <Ban className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                Denied
                            </span>
                            <span className="text-lg font-semibold tabular-nums">{counts.DENIED}</span>
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
