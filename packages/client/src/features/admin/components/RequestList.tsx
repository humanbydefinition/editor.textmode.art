import { Inbox, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import type { FilterOption, SketchRequest } from '../types';
import { RequestCard } from './RequestCard';

type RequestListProps = {
    requests: SketchRequest[];
    loading: boolean;
    statusFilter: FilterOption;
    updatingRequestId: string | null;
    regeneratingId: string | null;
    denyDrafts: Record<string, string>;
    onDenyDraftChange: (requestId: string, value: string) => void;
    onApprove: (request: SketchRequest) => void;
    onDeny: (request: SketchRequest) => void;
    onRegeneratePreview: (request: SketchRequest) => void;
    onCopySlug: (slug: string) => Promise<boolean>;
};

/**
 * Request list with loading and empty states
 */
export function RequestList({
    requests,
    loading,
    statusFilter,
    updatingRequestId,
    regeneratingId,
    denyDrafts,
    onDenyDraftChange,
    onApprove,
    onDeny,
    onRegeneratePreview,
    onCopySlug,
}: RequestListProps) {
    if (loading && requests.length === 0) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="overflow-hidden border-2 border-border bg-card">
                        <CardHeader className="space-y-3 border-b-2 border-border bg-background pb-4">
                            <Skeleton className="h-5 w-2/5" />
                            <Skeleton className="h-4 w-1/3" />
                        </CardHeader>
                        <CardContent className="space-y-4 py-5">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-[88%]" />
                                <Skeleton className="h-4 w-[72%]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (requests.length === 0) {
        const queueLabel =
            statusFilter === 'all' ? 'the entire moderation queue' : `the "${statusFilter}" queue`;

        return (
            <Card className="border-2 border-dashed border-border bg-card">
                <CardContent className="py-16 text-center">
                    <Inbox className="mx-auto mb-4 h-10 w-10 text-muted-foreground/70" />
                    <p className="text-sm font-medium">No requests found</p>
                    <p className="mt-1 text-sm text-muted-foreground">There are currently no items in {queueLabel}.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {loading && (
                <div className="flex items-center gap-2 rounded-lg border-2 border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                    Refreshing queue data...
                </div>
            )}
            {requests.map((request) => (
                <RequestCard
                    key={request.id}
                    request={request}
                    loading={loading || updatingRequestId === request.id}
                    regenerating={regeneratingId === request.id}
                    denyDraft={denyDrafts[request.id] ?? request.denialReason ?? ''}
                    onDenyDraftChange={(v) => onDenyDraftChange(request.id, v)}
                    onApprove={() => onApprove(request)}
                    onDeny={() => onDeny(request)}
                    onRegeneratePreview={() => onRegeneratePreview(request)}
                    onCopySlug={() => onCopySlug(request.slug)}
                />
            ))}
        </div>
    );
}

