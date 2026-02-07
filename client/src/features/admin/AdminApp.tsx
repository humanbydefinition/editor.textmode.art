import { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import type { AdminSketchListResponse } from '@synth.textmode.art/contracts/admin';

import {
    type FilterOption,
    type SketchRequest,
    type SketchStatus,
    type StatusCounts,
    TOKEN_STORAGE_KEY,
} from './types';
import { AdminHeader } from './components/AdminHeader';
import { AdminSidebar } from './components/AdminSidebar';
import { FilterTabs } from './components/FilterTabs';
import { MobileSettings } from './components/MobileSettings';
import { RequestList } from './components/RequestList';

const REVIEWER_STORAGE_KEY = 'admin_reviewer_name';

/**
 * Admin dashboard for reviewing sketch requests
 */
export function AdminApp() {
    const initialToken = localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
    const initialReviewer = localStorage.getItem(REVIEWER_STORAGE_KEY) ?? 'admin';

    const [tokenInput, setTokenInput] = useState(initialToken);
    const [activeToken, setActiveToken] = useState(initialToken);
    const [reviewerName, setReviewerName] = useState(initialReviewer);
    const [requests, setRequests] = useState<SketchRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<FilterOption>('pending');
    const [loading, setLoading] = useState(false);
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [denyDrafts, setDenyDrafts] = useState<Record<string, string>>({});

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(REVIEWER_STORAGE_KEY, reviewerName);
    }, [reviewerName]);

    useEffect(() => {
        if (!notice) return undefined;
        const timeoutId = window.setTimeout(() => setNotice(null), 2800);
        return () => window.clearTimeout(timeoutId);
    }, [notice]);

    const counts: StatusCounts = useMemo(() => {
        return requests.reduce(
            (acc, request) => {
                acc.all += 1;
                acc[request.status] += 1;
                return acc;
            },
            { all: 0, PENDING: 0, APPROVED: 0, DENIED: 0 }
        );
    }, [requests]);

    const filteredRequests = useMemo(() => {
        if (statusFilter === 'all') return requests;
        const statusMap: Record<Exclude<FilterOption, 'all'>, SketchStatus> = {
            pending: 'PENDING',
            approved: 'APPROVED',
            denied: 'DENIED',
        };
        return requests.filter((request) => request.status === statusMap[statusFilter]);
    }, [requests, statusFilter]);

    const fetchRequests = useCallback(async (authToken: string) => {
        const trimmedToken = authToken.trim();
        if (!trimmedToken) {
            setRequests([]);
            setError('Add your admin token to load requests.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/sketch-requests', {
                headers: { Authorization: `Bearer ${trimmedToken}` },
            });
            if (!response.ok) {
                throw new Error((await response.text()) || 'Failed to load requests');
            }

            const data = (await response.json()) as AdminSketchListResponse;
            setRequests(data.items ?? []);
            setLastSyncedAt(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load requests');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeToken.trim()) {
            void fetchRequests(activeToken);
        }
    }, [activeToken, fetchRequests]);

    const handleTokenSave = () => {
        const trimmedToken = tokenInput.trim();
        const tokenUnchanged = trimmedToken === activeToken;

        localStorage.setItem(TOKEN_STORAGE_KEY, trimmedToken);
        setActiveToken(trimmedToken);
        setError(null);

        if (!trimmedToken) {
            setRequests([]);
            setError('Add your admin token to load requests.');
            return;
        }

        if (tokenUnchanged) {
            void fetchRequests(trimmedToken);
        }
    };

    const handleRefresh = () => {
        if (!activeToken.trim()) {
            setError('Add your admin token to load requests.');
            return;
        }
        void fetchRequests(activeToken);
    };

    const updateRequestStatus = async (request: SketchRequest, nextStatus: SketchStatus) => {
        if (!activeToken.trim()) {
            setError('Add your admin token to update requests.');
            return;
        }

        const denialReason = denyDrafts[request.id]?.trim();
        if (nextStatus === 'DENIED' && !denialReason) {
            setError('Add a denial reason before denying a request.');
            return;
        }

        setUpdatingRequestId(request.id);
        setError(null);
        setNotice(null);

        try {
            const response = await fetch(`/api/admin/sketch-requests/${request.id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${activeToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: nextStatus,
                    denialReason: nextStatus === 'DENIED' ? denialReason : null,
                    reviewedBy: reviewerName || null,
                }),
            });

            if (!response.ok) {
                throw new Error((await response.text()) || 'Failed to update request');
            }

            const updated = (await response.json()) as SketchRequest;
            setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            setNotice(`${updated.slug} marked as ${updated.status.toLowerCase()}.`);
            setLastSyncedAt(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update request');
        } finally {
            setUpdatingRequestId(null);
        }
    };

    const copySlug = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(slug);
            setNotice(`Copied "${slug}" to clipboard.`);
        } catch {
            setError('Unable to copy to clipboard.');
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground">
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.14),transparent_36%),radial-gradient(circle_at_90%_100%,rgba(34,197,94,0.10),transparent_34%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0,transparent_calc(100%-1px),rgba(255,255,255,0.04)_100%),linear-gradient(to_bottom,transparent_0,transparent_calc(100%-1px),rgba(255,255,255,0.03)_100%)] bg-[size:28px_28px]" />
            </div>

            <AdminHeader
                loading={loading}
                reviewerName={reviewerName}
                pendingCount={counts.PENDING}
                totalCount={counts.all}
                lastSyncedAt={lastSyncedAt}
                onRefresh={handleRefresh}
            />

            <div className="relative z-10 mx-auto flex w-full max-w-[1600px]">
                <AdminSidebar
                    token={tokenInput}
                    reviewerName={reviewerName}
                    counts={counts}
                    loading={loading}
                    error={error}
                    onTokenChange={setTokenInput}
                    onReviewerNameChange={setReviewerName}
                    onSave={handleTokenSave}
                />

                <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
                    <div className="space-y-6">
                        <Card className="border-border/70 bg-card/70 backdrop-blur motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
                            <CardHeader className="gap-2 pb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                                        <Sparkles className="h-3 w-3" />
                                        Curated Gallery Queue
                                    </Badge>
                                    <Badge variant="outline" className="border-border/70 bg-muted/40 text-muted-foreground">
                                        {counts.PENDING} pending
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl sm:text-2xl">Moderate submitted gallery sketches</CardTitle>
                                <CardDescription className="max-w-3xl text-sm sm:text-base">
                                    Review custom slug submissions, keep quality high, and document clear denial reasons
                                    when a sketch does not meet curation standards.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {notice && (
                                    <Alert aria-live="polite" className="border-emerald-500/30 bg-emerald-500/10 py-3">
                                        <AlertDescription className="text-sm text-emerald-200">{notice}</AlertDescription>
                                    </Alert>
                                )}

                                {error && (
                                    <Alert aria-live="polite" className="border-destructive/30 bg-destructive/10 py-3">
                                        <AlertDescription className="text-sm text-destructive">{error}</AlertDescription>
                                    </Alert>
                                )}

                                <FilterTabs value={statusFilter} counts={counts} onChange={setStatusFilter} />
                            </CardContent>
                        </Card>

                        <RequestList
                            requests={filteredRequests}
                            loading={loading}
                            hasToken={Boolean(activeToken.trim())}
                            statusFilter={statusFilter}
                            updatingRequestId={updatingRequestId}
                            denyDrafts={denyDrafts}
                            onDenyDraftChange={(id, value) => setDenyDrafts((prev) => ({ ...prev, [id]: value }))}
                            onApprove={(request) => void updateRequestStatus(request, 'APPROVED')}
                            onDeny={(request) => void updateRequestStatus(request, 'DENIED')}
                            onCopySlug={(slug) => void copySlug(slug)}
                            onSaveCredentials={handleTokenSave}
                        />
                    </div>
                </main>
            </div>

            <div className="fixed right-4 bottom-4 z-40 lg:hidden">
                <Button
                    size="icon"
                    className="h-12 w-12 rounded-full border border-border/70 shadow-xl"
                    aria-label="Open moderation settings"
                    onClick={() => setSettingsOpen(true)}
                >
                    <Settings2 className="h-5 w-5" />
                </Button>
            </div>

            <MobileSettings
                open={settingsOpen}
                token={tokenInput}
                reviewerName={reviewerName}
                counts={counts}
                loading={loading}
                error={error}
                onOpenChange={setSettingsOpen}
                onTokenChange={setTokenInput}
                onReviewerNameChange={setReviewerName}
                onSave={handleTokenSave}
            />
        </div>
    );
}
