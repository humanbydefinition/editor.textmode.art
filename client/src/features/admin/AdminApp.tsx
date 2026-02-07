import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { AdminSketchListResponse } from '@synth.textmode.art/contracts/admin';

import {
    type SketchRequest,
    type SketchStatus,
    type FilterOption,
    type StatusCounts,
    TOKEN_STORAGE_KEY,
    SETTINGS_COLLAPSED_KEY,
} from './types';
import { AdminHeader } from './components/AdminHeader';
import { AdminSidebar } from './components/AdminSidebar';
import { MobileSettings } from './components/MobileSettings';
import { FilterTabs } from './components/FilterTabs';
import { RequestList } from './components/RequestList';

/**
 * Admin dashboard for reviewing sketch requests
 */
export function AdminApp() {
    // State
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? '');
    const [reviewerName, setReviewerName] = useState('admin');
    const [requests, setRequests] = useState<SketchRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<FilterOption>('pending');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [denyDrafts, setDenyDrafts] = useState<Record<string, string>>({});
    const [settingsOpen, setSettingsOpen] = useState(() => {
        const saved = localStorage.getItem(SETTINGS_COLLAPSED_KEY);
        return saved === 'true' || window.innerWidth >= 1024;
    });

    // Enable scrolling for admin page
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    // Persist settings state
    useEffect(() => {
        localStorage.setItem(SETTINGS_COLLAPSED_KEY, String(settingsOpen));
    }, [settingsOpen]);

    // Computed values
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
        return requests.filter((r) => r.status === statusMap[statusFilter]);
    }, [requests, statusFilter]);

    // API calls
    const fetchRequests = useCallback(async () => {
        if (!token) {
            setError('Add your admin token to load requests.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/sketch-requests', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(await response.text() || 'Failed to load');
            const data = (await response.json()) as AdminSketchListResponse;
            setRequests(data.items ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load requests');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) void fetchRequests();
    }, [fetchRequests, token]);

    const handleTokenSave = () => {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        void fetchRequests();
    };

    const updateRequestStatus = async (request: SketchRequest, nextStatus: SketchStatus) => {
        if (!token) return;
        const denialReason = denyDrafts[request.id]?.trim();
        if (nextStatus === 'DENIED' && !denialReason) {
            setError('Add a denial reason before denying a request.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/sketch-requests/${request.id}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: nextStatus,
                    denialReason: nextStatus === 'DENIED' ? denialReason : null,
                    reviewedBy: reviewerName || null,
                }),
            });
            if (!response.ok) throw new Error(await response.text() || 'Failed to update');
            const updated = (await response.json()) as SketchRequest;
            setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update request');
        } finally {
            setLoading(false);
        }
    };

    const copySlug = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(slug);
        } catch {
            setError('Unable to copy to clipboard.');
        }
    };

    return (
        <div className="min-h-screen w-full bg-background">
            {/* Background gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-950/20 via-transparent to-purple-950/20" />
            </div>

            <AdminHeader loading={loading} onRefresh={() => void fetchRequests()} />

            {/* Main Layout */}
            <div className="relative z-10 flex min-h-[calc(100vh-3.5rem)]">
                <AdminSidebar
                    token={token}
                    reviewerName={reviewerName}
                    counts={counts}
                    error={error}
                    onTokenChange={setToken}
                    onReviewerNameChange={setReviewerName}
                    onSave={handleTokenSave}
                />

                {/* Mobile Settings Toggle */}
                <div className="lg:hidden fixed bottom-4 right-4 z-50">
                    <Button
                        size="icon"
                        className="h-12 w-12 rounded-full shadow-lg"
                        onClick={() => setSettingsOpen(!settingsOpen)}
                    >
                        <ChevronDown className={`h-5 w-5 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                </div>

                <MobileSettings
                    open={settingsOpen}
                    token={token}
                    reviewerName={reviewerName}
                    counts={counts}
                    error={error}
                    onClose={() => setSettingsOpen(false)}
                    onTokenChange={setToken}
                    onReviewerNameChange={setReviewerName}
                    onSave={handleTokenSave}
                />

                {/* Main Content */}
                <main className="flex-1 min-w-0 overflow-auto">
                    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                        <p className="text-sm text-muted-foreground max-w-2xl">
                            Review custom slug submissions, approve or deny requests, and keep the gallery curated.
                        </p>

                        <FilterTabs value={statusFilter} counts={counts} onChange={setStatusFilter} />

                        <RequestList
                            requests={filteredRequests}
                            loading={loading}
                            denyDrafts={denyDrafts}
                            onDenyDraftChange={(id, v) => setDenyDrafts((p) => ({ ...p, [id]: v }))}
                            onApprove={(req) => void updateRequestStatus(req, 'APPROVED')}
                            onDeny={(req) => void updateRequestStatus(req, 'DENIED')}
                            onCopySlug={(slug) => void copySlug(slug)}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
