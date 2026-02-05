import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RefreshCw, ClipboardCopy, ShieldCheck, ExternalLink, Globe, Github, Instagram } from 'lucide-react';

const TOKEN_STORAGE_KEY = 'admin_api_token';

type SketchStatus = 'PENDING' | 'APPROVED' | 'DENIED';

type SocialLink = {
    label: string;
    url: string;
};

type SketchRequest = {
    id: string;
    slug: string;
    status: SketchStatus;
    title: string;
    description: string | null;
    authorName: string | null;
    license: string | null;
    socialLinks: SocialLink[] | null;
    textmodeCode: string;
    strudelCode: string | null;
    ogImageUrl: string | null;
    createdAt: string;
    updatedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
    denialReason: string | null;
};

type FilterOption = 'all' | 'pending' | 'approved' | 'denied';

function formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
}

function getLinks(raw: SketchRequest['socialLinks']): SocialLink[] {
    return Array.isArray(raw) ? raw : [];
}

function normalizeSocialLink(link: SocialLink): SocialLink {
    const label = link.label.trim();
    const url = link.url.trim();

    if (label.toLowerCase() === 'mastodon') {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return link;
        }

        const handle = url.startsWith('@') ? url.slice(1) : url;
        const [user, host] = handle.split('@');
        if (user && host) {
            return { ...link, url: `https://${host}/@${user}` };
        }
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { ...link, url: `https://${url}` };
    }

    return link;
}

function SocialIcon({ label }: { label: string }) {
    const key = label.toLowerCase();

    if (key === 'website') return <Globe className="h-3.5 w-3.5" />;
    if (key === 'github') return <Github className="h-3.5 w-3.5" />;
    if (key === 'instagram') return <Instagram className="h-3.5 w-3.5" />;
    if (key === 'bluesky') {
        return (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Bluesky">
                <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.585 3.493 6.18 3.254-.02.028-3.876.89-3.876 3.636 0 4.063 5.572 4.396 7.476 1.281.354-.578.598-1.258.598-2.068 0 .81.244 1.49.598 2.068 1.904 3.115 7.476 2.782 7.476-1.281 0-2.747-3.856-3.608-3.876-3.636 2.595.239 5.395-.627 6.18-3.254.246-.828.624-5.788.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.299-1.664-.621-4.3 1.24C14.046 4.747 11.087 8.686 12 10.8z" />
            </svg>
        );
    }
    if (key === 'mastodon') {
        return (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Mastodon">
                <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
            </svg>
        );
    }

    return <Globe className="h-3.5 w-3.5" />;
}

export function AdminApp() {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? '');
    const [reviewerName, setReviewerName] = useState('admin');
    const [requests, setRequests] = useState<SketchRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<FilterOption>('pending');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [denyDrafts, setDenyDrafts] = useState<Record<string, string>>({});

    // Enable scrolling for admin page
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const counts = useMemo(() => {
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

    const fetchRequests = useCallback(async (filter: FilterOption) => {
        if (!token) {
            setError('Add your admin token to load requests.');
            return;
        }

        setLoading(true);
        setError(null);

        // Always fetch all, filter locally for accurate counts
        try {
            const response = await fetch('/api/admin/sketch-requests', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || 'Failed to load requests');
            }

            const data = (await response.json()) as { items: SketchRequest[] };
            setRequests(data.items ?? []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load requests';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        void fetchRequests(statusFilter);
    }, [fetchRequests, statusFilter, token]);

    const handleTokenSave = () => {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        void fetchRequests(statusFilter);
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
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: nextStatus,
                    denialReason: nextStatus === 'DENIED' ? denialReason : null,
                    reviewedBy: reviewerName || null,
                }),
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || 'Failed to update request');
            }

            const updated = (await response.json()) as SketchRequest;
            setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update request';
            setError(message);
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

    const statusBadge = (status: SketchStatus) => {
        const styles = {
            PENDING: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
            APPROVED: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
            DENIED: 'bg-rose-500/20 text-rose-200 border border-rose-500/40',
        } as const;

        return (
            <Badge className={styles[status]}>{status.toLowerCase()}</Badge>
        );
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
            {/* Background gradient decorations */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 left-[-15%] h-96 w-[70%] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15),transparent_60%)]" />
                <div className="absolute top-1/3 right-[-20%] h-[500px] w-[60%] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.12),transparent_60%)]" />
            </div>

            <div className="relative z-10 mx-auto max-w-6xl px-6 py-10">
                {/* Header */}
                <header className="flex flex-wrap items-start justify-between gap-6 mb-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-purple-500/20 border border-white/10">
                                <ShieldCheck className="h-6 w-6 text-sky-300" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-medium">synth.textmode.art</p>
                                <h1 className="text-2xl font-semibold tracking-tight">Admin Console</h1>
                            </div>
                        </div>
                        <p className="text-sm text-zinc-400 max-w-lg">
                            Review custom slug submissions, approve or deny requests, and keep the public gallery curated.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
                        onClick={() => void fetchRequests(statusFilter)}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </header>

                {/* Main grid */}
                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Access card */}
                        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
                            <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium mb-5">Access</h2>
                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs text-zinc-400 block mb-2">Admin token</label>
                                    <input
                                        type="password"
                                        value={token}
                                        onChange={(event) => setToken(event.target.value)}
                                        placeholder="Enter ADMIN_API_TOKEN"
                                        className="w-full rounded-lg border border-white/10 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-colors"
                                    />
                                </div>
                                <Button
                                    className="w-full bg-sky-500/20 text-sky-100 border border-sky-400/30 hover:bg-sky-500/30"
                                    onClick={handleTokenSave}
                                >
                                    Save & Load
                                </Button>
                                <div>
                                    <label className="text-xs text-zinc-400 block mb-2">Reviewer name</label>
                                    <input
                                        type="text"
                                        value={reviewerName}
                                        onChange={(event) => setReviewerName(event.target.value)}
                                        placeholder="admin"
                                        className="w-full rounded-lg border border-white/10 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-colors"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Stats card */}
                        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
                            <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium mb-5">Statistics</h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-white/5">
                                    <span className="text-sm text-zinc-400">Pending</span>
                                    <span className="text-lg font-semibold text-amber-300">{counts.PENDING}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-white/5">
                                    <span className="text-sm text-zinc-400">Approved</span>
                                    <span className="text-lg font-semibold text-emerald-300">{counts.APPROVED}</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-zinc-400">Denied</span>
                                    <span className="text-lg font-semibold text-rose-300">{counts.DENIED}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="space-y-6">
                        {/* Filter tabs */}
                        <div className="flex flex-wrap gap-2">
                            {(['all', 'pending', 'approved', 'denied'] as const).map((filter) => {
                                const isActive = statusFilter === filter;
                                return (
                                    <button
                                        key={filter}
                                        type="button"
                                        onClick={() => setStatusFilter(filter)}
                                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${isActive
                                                ? 'bg-white/10 text-white border border-white/20'
                                                : 'bg-zinc-900/50 text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-zinc-800/50'
                                            }`}
                                    >
                                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                        {filter !== 'all' && (
                                            <span className="ml-2 text-xs opacity-60">
                                                {counts[filter === 'pending' ? 'PENDING' : filter === 'approved' ? 'APPROVED' : 'DENIED']}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Request list */}
                        {loading && requests.length === 0 && (
                            <div className="rounded-xl border border-white/10 bg-zinc-900/30 p-8 text-center text-zinc-400">
                                Loading requests...
                            </div>
                        )}

                        {!loading && filteredRequests.length === 0 && (
                            <div className="rounded-xl border border-white/10 bg-zinc-900/30 p-8 text-center text-zinc-500">
                                No requests to show in this queue.
                            </div>
                        )}

                        <div className="space-y-4">
                            {filteredRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm"
                                >
                                    {/* Request header */}
                                    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold">{request.title}</h3>
                                                {statusBadge(request.status)}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <code className="rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs text-sky-300 font-mono">
                                                    /s/{request.slug}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() => void copySlug(request.slug)}
                                                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                                                >
                                                    <ClipboardCopy className="h-3.5 w-3.5" />
                                                    Copy
                                                </button>
                                                {request.status === 'APPROVED' && (
                                                    <a
                                                        href={`/s/${request.slug}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Preview
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-zinc-500 text-right space-y-1">
                                            <p>Submitted: {formatDate(request.createdAt)}</p>
                                            {request.reviewedAt && <p>Reviewed: {formatDate(request.reviewedAt)}</p>}
                                        </div>
                                    </div>

                                    {/* Request details */}
                                    {request.description && (
                                        <p className="text-sm text-zinc-300 mb-5 max-w-2xl">{request.description}</p>
                                    )}

                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* Meta info */}
                                        <div className="space-y-3 text-sm">
                                            <div className="flex gap-3">
                                                <span className="text-xs uppercase tracking-wider text-zinc-500 w-16">Author</span>
                                                <span className="text-zinc-300">{request.authorName || '—'}</span>
                                            </div>
                                            <div className="flex gap-3">
                                                <span className="text-xs uppercase tracking-wider text-zinc-500 w-16">License</span>
                                                <span className="text-zinc-300">{request.license || '—'}</span>
                                            </div>
                                            <div className="flex gap-3">
                                                <span className="text-xs uppercase tracking-wider text-zinc-500 w-16">Code</span>
                                                <span className="text-zinc-400">
                                                    textmode: {request.textmodeCode.length.toLocaleString()} chars
                                                    {request.strudelCode && `, strudel: ${request.strudelCode.length.toLocaleString()} chars`}
                                                </span>
                                            </div>
                                            <div className="flex gap-3">
                                                <span className="text-xs uppercase tracking-wider text-zinc-500 w-16">Links</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {getLinks(request.socialLinks).length === 0 && <span className="text-zinc-500">—</span>}
                                                    {getLinks(request.socialLinks).map((link) => {
                                                        const normalized = normalizeSocialLink(link);
                                                        return (
                                                        <a
                                                            key={`${link.label}-${normalized.url}`}
                                                            href={normalized.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-zinc-900/40 px-2.5 py-1 text-xs text-sky-300 hover:text-sky-200 hover:border-white/20 transition-colors"
                                                        >
                                                            <SocialIcon label={link.label} />
                                                            {link.label}
                                                        </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-zinc-500 block mb-2">Denial reason (required for deny)</label>
                                                <textarea
                                                    value={denyDrafts[request.id] ?? request.denialReason ?? ''}
                                                    onChange={(event) =>
                                                        setDenyDrafts((prev) => ({ ...prev, [request.id]: event.target.value }))
                                                    }
                                                    placeholder="Enter reason..."
                                                    className="w-full min-h-[80px] rounded-lg border border-white/10 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-colors resize-none"
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <Button
                                                    className="flex-1 bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 hover:bg-emerald-500/30"
                                                    onClick={() => void updateRequestStatus(request, 'APPROVED')}
                                                    disabled={loading}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    className="flex-1 bg-rose-500/20 text-rose-100 border border-rose-400/30 hover:bg-rose-500/30"
                                                    onClick={() => void updateRequestStatus(request, 'DENIED')}
                                                    disabled={loading}
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Deny
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Show denial reason if denied */}
                                    {request.status === 'DENIED' && request.denialReason && (
                                        <div className="mt-5 pt-5 border-t border-white/5">
                                            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Denial Reason</p>
                                            <p className="text-sm text-rose-300">{request.denialReason}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
