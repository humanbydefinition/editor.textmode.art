import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import type { AdminSessionResponse, AdminSketchListResponse } from '@synth.textmode.art/contracts/admin';

import {
    type FilterOption,
    type SketchRequest,
    type SketchStatus,
    REVIEWER_STORAGE_KEY,
    type StatusCounts,
    TOKEN_STORAGE_KEY,
} from './types';
import { AdminHeader } from './components/AdminHeader';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminSidebar } from './components/AdminSidebar';
import { FilterTabs } from './components/FilterTabs';
import { MobileSettings } from './components/MobileSettings';
import { RequestList } from './components/RequestList';
import { getApiErrorMessage } from './utils';

type AuthenticateOptions = {
    silent?: boolean;
};

function normalizeReviewerName(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : 'admin';
}

/**
 * Admin dashboard for reviewing sketch requests
 */
export function AdminApp() {
    const [tokenInput, setTokenInput] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? '');
    const [reviewerDraft, setReviewerDraft] = useState(() =>
        normalizeReviewerName(localStorage.getItem(REVIEWER_STORAGE_KEY) ?? 'admin')
    );
    const [activeToken, setActiveToken] = useState('');
    const [reviewerName, setReviewerName] = useState(() =>
        normalizeReviewerName(localStorage.getItem(REVIEWER_STORAGE_KEY) ?? 'admin')
    );
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authenticating, setAuthenticating] = useState(false);
    const [restoringSession, setRestoringSession] = useState(() =>
        Boolean((localStorage.getItem(TOKEN_STORAGE_KEY) ?? '').trim())
    );
    const [authError, setAuthError] = useState<string | null>(null);

    const [requests, setRequests] = useState<SketchRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<FilterOption>('pending');
    const [loading, setLoading] = useState(false);
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [denyDrafts, setDenyDrafts] = useState<Record<string, string>>({});

    const restoreAttemptedRef = useRef(false);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

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

    const resetDashboardState = useCallback(() => {
        setRequests([]);
        setDenyDrafts({});
        setUpdatingRequestId(null);
        setLastSyncedAt(null);
        setSettingsOpen(false);
        setLoading(false);
    }, []);

    const handleSessionExpired = useCallback(
        (message = 'Your admin session expired. Sign in again.') => {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setIsAuthenticated(false);
            setActiveToken('');
            setTokenInput('');
            setAuthError(message);
            setError(null);
            setNotice(null);
            resetDashboardState();
        },
        [resetDashboardState]
    );

    const authenticate = useCallback(async (tokenCandidate: string, reviewerCandidate: string, options?: AuthenticateOptions) => {
        const trimmedToken = tokenCandidate.trim();
        const normalizedReviewer = normalizeReviewerName(reviewerCandidate);

        if (!trimmedToken) {
            setAuthError('Enter your admin token to continue.');
            return false;
        }

        setAuthenticating(true);
        if (!options?.silent) {
            setAuthError(null);
        }

        try {
            const response = await fetch('/api/admin/session', {
                headers: { Authorization: `Bearer ${trimmedToken}` },
            });

            if (!response.ok) {
                throw new Error(await getApiErrorMessage(response, 'Authentication failed.'));
            }

            const session = (await response.json()) as AdminSessionResponse;
            if (!session.authenticated) {
                throw new Error('Authentication failed.');
            }

            localStorage.setItem(TOKEN_STORAGE_KEY, trimmedToken);
            localStorage.setItem(REVIEWER_STORAGE_KEY, normalizedReviewer);

            setIsAuthenticated(true);
            setActiveToken(trimmedToken);
            setReviewerName(normalizedReviewer);
            setReviewerDraft(normalizedReviewer);
            setTokenInput(trimmedToken);
            setAuthError(null);
            setError(null);
            return true;
        } catch (err) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setIsAuthenticated(false);
            setActiveToken('');
            setRequests([]);

            if (options?.silent) {
                setTokenInput('');
                setAuthError('Saved admin session is no longer valid. Sign in again.');
            } else {
                setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
            }
            return false;
        } finally {
            setAuthenticating(false);
        }
    }, []);

    useEffect(() => {
        if (restoreAttemptedRef.current) return;
        restoreAttemptedRef.current = true;

        const storedToken = tokenInput.trim();
        if (!storedToken) {
            setRestoringSession(false);
            return;
        }

        void authenticate(storedToken, reviewerDraft, { silent: true }).finally(() => {
            setRestoringSession(false);
        });
    }, [authenticate, tokenInput, reviewerDraft]);

    const fetchRequests = useCallback(async (authToken: string) => {
        const trimmedToken = authToken.trim();
        if (!trimmedToken) {
            setRequests([]);
            setError('Your admin session is not active.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/sketch-requests', {
                headers: { Authorization: `Bearer ${trimmedToken}` },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleSessionExpired();
                    return;
                }
                throw new Error(await getApiErrorMessage(response, 'Failed to load requests'));
            }

            const data = (await response.json()) as AdminSketchListResponse;
            setRequests(data.items ?? []);
            setLastSyncedAt(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load requests');
        } finally {
            setLoading(false);
        }
    }, [handleSessionExpired]);

    useEffect(() => {
        if (isAuthenticated && activeToken.trim()) {
            void fetchRequests(activeToken);
        }
    }, [isAuthenticated, activeToken, fetchRequests]);

    const handleReviewerNameChange = (value: string) => {
        const normalizedReviewer = normalizeReviewerName(value);
        localStorage.setItem(REVIEWER_STORAGE_KEY, normalizedReviewer);
        setReviewerName(normalizedReviewer);
        setReviewerDraft(normalizedReviewer);
    };

    const handleLoginSubmit = () => {
        void authenticate(tokenInput, reviewerDraft);
    };

    const handleRefresh = () => {
        void fetchRequests(activeToken);
    };

    const handleSignOut = useCallback(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setIsAuthenticated(false);
        setActiveToken('');
        setTokenInput('');
        setAuthError(null);
        setError(null);
        setNotice(null);
        resetDashboardState();
    }, [resetDashboardState]);

    const updateRequestStatus = async (request: SketchRequest, nextStatus: SketchStatus) => {
        if (!isAuthenticated || !activeToken.trim()) {
            setError('Your admin session is not active.');
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
                    reviewedBy: normalizeReviewerName(reviewerName),
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleSessionExpired();
                    return;
                }
                throw new Error(await getApiErrorMessage(response, 'Failed to update request'));
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

    if (!isAuthenticated) {
        return (
            <AdminLoginPage
                token={tokenInput}
                reviewerName={reviewerDraft}
                loading={authenticating || restoringSession}
                error={authError}
                onTokenChange={setTokenInput}
                onReviewerNameChange={setReviewerDraft}
                onSubmit={handleLoginSubmit}
            />
        );
    }

    return (
        <div className="min-h-screen w-full bg-background text-foreground">
            <AdminHeader
                loading={loading}
                reviewerName={reviewerName}
                pendingCount={counts.PENDING}
                totalCount={counts.all}
                lastSyncedAt={lastSyncedAt}
                onRefresh={handleRefresh}
                onSignOut={handleSignOut}
            />

            <div className="mx-auto flex w-full max-w-[1600px]">
                <AdminSidebar
                    reviewerName={reviewerName}
                    counts={counts}
                    onReviewerNameChange={handleReviewerNameChange}
                    onSignOut={handleSignOut}
                />

                <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
                    <div className="space-y-6">
                        <Card className="rounded-xl border-2 border-border bg-card">
                            <CardHeader className="gap-2 pb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="border-2 border-primary bg-background text-primary">
                                        <Sparkles className="h-3 w-3" />
                                        Curated Gallery Queue
                                    </Badge>
                                    <Badge variant="outline" className="border-2 border-border bg-background text-muted-foreground">
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
                                    <Alert aria-live="polite" className="rounded-lg border-2 border-emerald-500 bg-background py-3">
                                        <AlertDescription className="text-sm text-emerald-200">{notice}</AlertDescription>
                                    </Alert>
                                )}

                                {error && (
                                    <Alert aria-live="polite" className="rounded-lg border-2 border-destructive bg-background py-3">
                                        <AlertDescription className="text-sm text-destructive">{error}</AlertDescription>
                                    </Alert>
                                )}

                                <FilterTabs value={statusFilter} counts={counts} onChange={setStatusFilter} />
                            </CardContent>
                        </Card>

                        <RequestList
                            requests={filteredRequests}
                            loading={loading}
                            statusFilter={statusFilter}
                            updatingRequestId={updatingRequestId}
                            denyDrafts={denyDrafts}
                            onDenyDraftChange={(id, value) => setDenyDrafts((prev) => ({ ...prev, [id]: value }))}
                            onApprove={(request) => void updateRequestStatus(request, 'APPROVED')}
                            onDeny={(request) => void updateRequestStatus(request, 'DENIED')}
                            onCopySlug={(slug) => void copySlug(slug)}
                        />
                    </div>
                </main>
            </div>

            <div className="fixed right-4 bottom-4 z-40 lg:hidden">
                <Button
                    size="icon"
                    className="h-12 w-12 rounded-full border-2 border-border shadow-none"
                    aria-label="Open moderation settings"
                    onClick={() => setSettingsOpen(true)}
                >
                    <Settings2 className="h-5 w-5" />
                </Button>
            </div>

            <MobileSettings
                open={settingsOpen}
                reviewerName={reviewerName}
                counts={counts}
                onOpenChange={setSettingsOpen}
                onReviewerNameChange={handleReviewerNameChange}
                onSignOut={handleSignOut}
            />
        </div>
    );
}

