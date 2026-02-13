import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import type { AdminSessionResponse, AdminSketchListResponse } from '@synth.textmode.art/contracts/admin';
import { toast } from 'sonner';

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
import { Toaster } from '@/shared/ui/sonner';

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
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [denyDrafts, setDenyDrafts] = useState<Record<string, string>>({});

    const restoreAttemptedRef = useRef(false);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

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
            toast.error(message);
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
            toast.error('Your admin session is not active.');
            return;
        }

        setLoading(true);

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
            toast.error(err instanceof Error ? err.message : 'Failed to load requests');
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
        resetDashboardState();
    }, [resetDashboardState]);

    const updateRequestStatus = async (request: SketchRequest, nextStatus: SketchStatus) => {
        if (!isAuthenticated || !activeToken.trim()) {
            toast.error('Your admin session is not active.');
            return;
        }

        const denialReason = denyDrafts[request.id]?.trim();
        if (nextStatus === 'DENIED' && !denialReason) {
            toast.error('Add a denial reason before denying a request.');
            return;
        }

        setUpdatingRequestId(request.id);

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
            toast.success(`${updated.slug} marked as ${updated.status.toLowerCase()}.`);
            setLastSyncedAt(new Date());
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update request');
        } finally {
            setUpdatingRequestId(null);
        }
    };

    const handleRegeneratePreview = async (request: SketchRequest) => {
        if (!isAuthenticated || !activeToken.trim()) {
            toast.error('Your admin session is not active.');
            return;
        }

        setRegeneratingId(request.id);

        try {
            const response = await fetch(`/api/admin/sketch-requests/${request.id}/regenerate-preview`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${activeToken}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleSessionExpired();
                    return;
                }
                throw new Error(await getApiErrorMessage(response, 'Failed to regenerate preview'));
            }

            if (response.status === 202) {
                toast.info(`Preview regeneration queued for ${request.slug}`);
                
                const originalUpdatedAt = request.updatedAt;
                let attempts = 0;
                const maxAttempts = 20; // Increased attempts
                const pollInterval = setInterval(async () => {
                    attempts++;
                    if (attempts > maxAttempts) {
                        clearInterval(pollInterval);
                        setRegeneratingId(null);
                        toast.error(`Timed out waiting for ${request.slug} preview`);
                        return;
                    }

                    try {
                        const pollResponse = await fetch(`/api/admin/sketch-requests/${request.id}`, {
                            headers: { Authorization: `Bearer ${activeToken}` },
                        });

                        if (pollResponse.ok) {
                            const updated = (await pollResponse.json()) as SketchRequest;
                            
                            // Check if the record has been updated since we started
                            if (updated.updatedAt !== originalUpdatedAt) {
                                clearInterval(pollInterval);
                                
                                // Force cache bust for the image
                                if (updated.ogImageUrl) {
                                    const url = new URL(updated.ogImageUrl, window.location.origin);
                                    url.searchParams.set('t', Date.now().toString());
                                    updated.ogImageUrl = url.toString();
                                }

                                setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                                setRegeneratingId(null);
                                toast.success(`Preview regenerated for ${updated.slug}`);
                            }
                        }
                    } catch (err) {
                        console.error('Polling error:', err);
                    }
                }, 3000);
            } else {
                const updated = (await response.json()) as SketchRequest;

                // Force a new URL to bust cache if the backend returns the same filename
                if (updated.ogImageUrl) {
                    const url = new URL(updated.ogImageUrl, window.location.origin);
                    url.searchParams.set('t', Date.now().toString());
                    updated.ogImageUrl = url.toString();
                }

                setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                toast.success(`Preview regenerated for ${updated.slug}`);
                setRegeneratingId(null);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to regenerate preview');
            setRegeneratingId(null);
        }
    };

    const copySlug = async (slug: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(slug);
            return true;
        } catch {
            return false;
        }
    };

    if (!isAuthenticated) {
        return (
            <>
                <AdminLoginPage
                    token={tokenInput}
                    reviewerName={reviewerDraft}
                    loading={authenticating || restoringSession}
                    error={authError}
                    onTokenChange={setTokenInput}
                    onReviewerNameChange={setReviewerDraft}
                    onSubmit={handleLoginSubmit}
                />
                <Toaster position="top-right" />
            </>
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
                                <CardTitle className="text-xl sm:text-2xl">Moderate submitted gallery sketches</CardTitle>
                                <CardDescription className="max-w-3xl text-sm sm:text-base">
                                    Review custom slug submissions, keep quality high, and document clear denial reasons
                                    when a sketch does not meet curation standards.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <FilterTabs value={statusFilter} counts={counts} onChange={setStatusFilter} />
                            </CardContent>
                        </Card>

                        <RequestList
                            requests={filteredRequests}
                            loading={loading}
                            statusFilter={statusFilter}
                            updatingRequestId={updatingRequestId}
                            regeneratingId={regeneratingId}
                            denyDrafts={denyDrafts}
                            onDenyDraftChange={(id, value) => setDenyDrafts((prev) => ({ ...prev, [id]: value }))}
                            onApprove={(request) => void updateRequestStatus(request, 'APPROVED')}
                            onDeny={(request) => void updateRequestStatus(request, 'DENIED')}
                            onRegeneratePreview={handleRegeneratePreview}
                            onCopySlug={(slug) => copySlug(slug)}
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
            <Toaster position="top-right" />
        </div>
    );
}