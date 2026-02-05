import { CheckCircle2, XCircle, ClipboardCopy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SketchRequest } from '../types';
import { formatDate, getLinks, normalizeSocialLink } from '../utils';
import { SocialIcon } from './SocialIcon';

type RequestCardProps = {
    request: SketchRequest;
    loading: boolean;
    denyDraft: string;
    onDenyDraftChange: (value: string) => void;
    onApprove: () => void;
    onDeny: () => void;
    onCopySlug: () => void;
};

const statusStyles = {
    PENDING: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    APPROVED: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
    DENIED: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
} as const;

/**
 * Individual sketch request card with metadata and actions
 */
export function RequestCard({
    request,
    loading,
    denyDraft,
    onDenyDraftChange,
    onApprove,
    onDeny,
    onCopySlug,
}: RequestCardProps) {
    const links = getLinks(request.socialLinks);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/30">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-lg break-all">{request.title}</CardTitle>
                            <Badge className={`border shrink-0 ${statusStyles[request.status]}`}>
                                {request.status.toLowerCase()}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <code className="rounded bg-background px-2 py-0.5 text-xs font-mono text-primary">
                                /s/{request.slug}
                            </code>
                            <button
                                type="button"
                                onClick={onCopySlug}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ClipboardCopy className="h-3 w-3" />
                                Copy
                            </button>
                            {request.status === 'APPROVED' && (
                                <a
                                    href={`/s/${request.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Preview
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground lg:text-right space-y-0.5">
                        <p>Submitted: {formatDate(request.createdAt)}</p>
                        {request.reviewedAt && <p>Reviewed: {formatDate(request.reviewedAt)}</p>}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                {request.description && (
                    <p className="text-sm text-muted-foreground mb-6">{request.description}</p>
                )}

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Metadata */}
                    <div className="grid gap-3 text-sm content-start">
                        <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">Author</span>
                            <span className="break-all">{request.authorName || '—'}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">License</span>
                            <span>{request.license || '—'}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">Code</span>
                            <span className="text-muted-foreground">
                                textmode: {request.textmodeCode.length.toLocaleString()} chars
                                {request.strudelCode && `, strudel: ${request.strudelCode.length.toLocaleString()} chars`}
                            </span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">Links</span>
                            <div className="flex flex-wrap gap-1.5">
                                {links.length === 0 && <span className="text-muted-foreground">—</span>}
                                {links.map((link) => {
                                    const normalized = normalizeSocialLink(link);
                                    return (
                                        <a
                                            key={`${link.label}-${normalized.url}`}
                                            href={normalized.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded border border-border bg-muted/50 px-2 py-0.5 text-xs text-primary hover:bg-muted transition-colors"
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
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1.5">
                                Denial reason (required for deny)
                            </label>
                            <textarea
                                value={denyDraft}
                                onChange={(e) => onDenyDraftChange(e.target.value)}
                                placeholder="Enter reason..."
                                className="w-full min-h-[72px] rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={onApprove}
                                disabled={loading}
                            >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                Approve
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={onDeny}
                                disabled={loading}
                            >
                                <XCircle className="h-4 w-4 mr-1.5" />
                                Deny
                            </Button>
                        </div>
                    </div>
                </div>

                {request.status === 'DENIED' && request.denialReason && (
                    <div className="mt-6 pt-4 border-t border-border">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Denial Reason</p>
                        <p className="text-sm text-rose-400">{request.denialReason}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
