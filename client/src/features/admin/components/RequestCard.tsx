import { useState } from 'react';
import { CheckCircle2, ClipboardCopy, ExternalLink, Link2, UserRound, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';
import { Textarea } from '@/shared/ui/textarea';
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

const statusStyles: Record<SketchRequest['status'], string> = {
    PENDING: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    APPROVED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    DENIED: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
};

const statusLabel: Record<SketchRequest['status'], string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    DENIED: 'Denied',
};

function renderValue(value: string | null): string {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : 'N/A';
}

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
    const [denyConfirmOpen, setDenyConfirmOpen] = useState(false);
    const hasDenialReason = denyDraft.trim().length > 0;

    return (
        <>
            <Card className="overflow-hidden border-border/70 bg-card/70 shadow-sm transition-colors duration-200 motion-reduce:transition-none hover:border-border">
                <CardHeader className="gap-4 border-b border-border/70 bg-muted/20 pb-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="break-all text-base sm:text-lg">{request.title}</CardTitle>
                                <Badge className={`border ${statusStyles[request.status]}`}>{statusLabel[request.status]}</Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <code className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-primary">
                                    /s/{request.slug}
                                </code>
                                <span>Submitted {formatDate(request.createdAt)}</span>
                                {request.reviewedAt && <span>Reviewed {formatDate(request.reviewedAt)}</span>}
                            </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={onCopySlug}>
                                <ClipboardCopy className="h-3.5 w-3.5" />
                                Copy slug
                            </Button>
                            {request.status === 'APPROVED' ? (
                                <Button variant="outline" size="sm" asChild>
                                    <a href={`/s/${request.slug}`} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Preview
                                    </a>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Preview
                                </Button>
                            )}
                        </div>
                    </div>

                </CardHeader>

                <CardContent className="space-y-6 py-5">
                    {request.description && (
                        <p className="rounded-lg border border-border/70 bg-background/50 p-3 text-sm leading-6 text-muted-foreground">
                            {request.description}
                        </p>
                    )}

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                        <section className="space-y-4">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Author</p>
                                    <p className="mt-2 flex items-center gap-2 break-all text-sm">
                                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                                        {renderValue(request.authorName)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">License</p>
                                    <p className="mt-2 text-sm">{renderValue(request.license)}</p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Code Payload</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="border-border/70 bg-muted/40 text-muted-foreground">
                                        textmode {request.textmodeCode.length.toLocaleString()} chars
                                    </Badge>
                                    <Badge variant="outline" className="border-border/70 bg-muted/40 text-muted-foreground">
                                        strudel{' '}
                                        {request.strudelCode
                                            ? `${request.strudelCode.length.toLocaleString()} chars`
                                            : 'not provided'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Social Links</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {links.length === 0 && (
                                        <span className="text-sm text-muted-foreground">No social links submitted.</span>
                                    )}
                                    {links.map((link) => {
                                        const normalized = normalizeSocialLink(link);
                                        return (
                                            <a
                                                key={`${link.label}-${normalized.url}`}
                                                href={normalized.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-xs transition-colors duration-200 motion-reduce:transition-none hover:bg-muted"
                                            >
                                                <SocialIcon label={link.label} />
                                                <span>{link.label}</span>
                                                <Link2 className="h-3 w-3 text-muted-foreground" />
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3 rounded-lg border border-border/70 bg-background/35 p-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Moderation Action</h3>
                                <p className="text-xs text-muted-foreground">
                                    Denial reason is required before denying. Keep feedback specific and concise.
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label htmlFor={`denial-reason-${request.id}`}>Denial reason</Label>
                                <Textarea
                                    id={`denial-reason-${request.id}`}
                                    name={`denial-reason-${request.id}`}
                                    value={denyDraft}
                                    onChange={(e) => onDenyDraftChange(e.target.value)}
                                    placeholder="Explain why this request should be denied..."
                                    className="min-h-[110px] resize-none"
                                    maxLength={300}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    className="bg-emerald-600 text-white transition-colors duration-200 motion-reduce:transition-none hover:bg-emerald-700"
                                    onClick={onApprove}
                                    disabled={loading}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {loading ? 'Saving...' : 'Approve'}
                                </Button>
                                <Button variant="destructive" onClick={() => setDenyConfirmOpen(true)} disabled={loading}>
                                    <XCircle className="h-4 w-4" />
                                    {loading ? 'Saving...' : 'Deny'}
                                </Button>
                            </div>

                            {request.reviewedBy && (
                                <p className="text-xs text-muted-foreground">Last reviewed by {request.reviewedBy}</p>
                            )}
                        </section>
                    </div>

                    {request.status === 'DENIED' && request.denialReason && (
                        <Alert className="border-rose-500/40 bg-rose-500/10">
                            <AlertTitle className="text-rose-200">Previous denial reason</AlertTitle>
                            <AlertDescription className="text-rose-100/90">{request.denialReason}</AlertDescription>
                        </Alert>
                    )}

                    {request.status === 'DENIED' && (
                        <Alert className="border-amber-500/40 bg-amber-500/10">
                            <AlertTitle className="text-amber-200">Slug reusable</AlertTitle>
                            <AlertDescription className="text-amber-100/90">
                                <code className="rounded border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 font-mono">
                                    /s/{request.slug}
                                </code>{' '}
                                can now be claimed by a new submission.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Dialog open={denyConfirmOpen} onOpenChange={setDenyConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Deny this submission?</DialogTitle>
                        <DialogDescription>
                            This action updates the gallery review status immediately and stores your denial reason.
                        </DialogDescription>
                    </DialogHeader>
                    {!hasDenialReason && (
                        <Alert className="border-destructive/30 bg-destructive/10 py-3">
                            <AlertDescription className="text-sm text-destructive">
                                Add a denial reason before confirming.
                            </AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDenyConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setDenyConfirmOpen(false);
                                onDeny();
                            }}
                            disabled={loading || !hasDenialReason}
                        >
                            Confirm deny
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
