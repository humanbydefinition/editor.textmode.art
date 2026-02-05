import { RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SketchRequest } from '../types';
import { RequestCard } from './RequestCard';

type RequestListProps = {
    requests: SketchRequest[];
    loading: boolean;
    denyDrafts: Record<string, string>;
    onDenyDraftChange: (requestId: string, value: string) => void;
    onApprove: (request: SketchRequest) => void;
    onDeny: (request: SketchRequest) => void;
    onCopySlug: (slug: string) => void;
};

/**
 * Request list with loading and empty states
 */
export function RequestList({
    requests,
    loading,
    denyDrafts,
    onDenyDraftChange,
    onApprove,
    onDeny,
    onCopySlug,
}: RequestListProps) {
    if (loading && requests.length === 0) {
        return (
            <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-50" />
                    Loading requests...
                </CardContent>
            </Card>
        );
    }

    if (requests.length === 0) {
        return (
            <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                    No requests to show in this queue.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4">
            {requests.map((request) => (
                <RequestCard
                    key={request.id}
                    request={request}
                    loading={loading}
                    denyDraft={denyDrafts[request.id] ?? request.denialReason ?? ''}
                    onDenyDraftChange={(v) => onDenyDraftChange(request.id, v)}
                    onApprove={() => onApprove(request)}
                    onDeny={() => onDeny(request)}
                    onCopySlug={() => onCopySlug(request.slug)}
                />
            ))}
        </div>
    );
}
