import { RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';

type AdminHeaderProps = {
    loading: boolean;
    reviewerName: string;
    pendingCount: number;
    totalCount: number;
    lastSyncedAt: Date | null;
    onRefresh: () => void;
};

/**
 * Sticky header bar with logo and refresh button
 */
export function AdminHeader({
    loading,
    reviewerName,
    pendingCount,
    totalCount,
    lastSyncedAt,
    onRefresh,
}: AdminHeaderProps) {
    const syncLabel = lastSyncedAt
        ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Not synced yet';

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
            <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            synth.textmode.art moderation
                        </p>
                        <h1 className="truncate text-sm font-semibold sm:text-base">das nest</h1>
                    </div>
                </div>

                <div className="hidden items-center gap-2 md:flex">
                    <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-300">
                        <Sparkles className="h-3 w-3" />
                        Pending {pendingCount}
                    </Badge>
                    <Badge variant="outline" className="border-border/70 bg-muted/40 text-muted-foreground">
                        Total {totalCount}
                    </Badge>
                    <Badge variant="outline" className="border-border/70 bg-muted/30 text-muted-foreground">
                        Reviewer: {reviewerName || 'admin'}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-muted-foreground sm:inline">{syncLabel}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={loading}
                        aria-label="Refresh moderation queue"
                        className="transition-transform duration-200 motion-reduce:transition-none"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </div>
            </div>
            <div className="mx-auto w-full max-w-[1600px] px-4 pb-3 sm:hidden">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300">
                        Pending {pendingCount}
                    </Badge>
                    <Badge variant="outline" className="border-border/70 bg-muted/40 text-muted-foreground">
                        Total {totalCount}
                    </Badge>
                    <span className="ml-auto text-[11px] text-muted-foreground">{syncLabel}</span>
                </div>
            </div>
        </header>
    );
}
