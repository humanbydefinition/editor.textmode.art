import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import {
    Check,
    CheckCircle2,
    ClipboardCopy,
    ExternalLink,
    Image as ImageIcon,
    Link2,
    RefreshCw,
    UserRound,
    X,
    XCircle,
} from 'lucide-react';
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
    regenerating: boolean;
    denyDraft: string;
    onDenyDraftChange: (value: string) => void;
    onApprove: () => void;
    onDeny: () => void;
    onRegeneratePreview: () => void;
    onCopySlug: () => Promise<boolean>;
};

const statusStyles: Record<SketchRequest['status'], string> = {
    PENDING: 'rounded-md border-2 border-amber-500 bg-background text-amber-200',
    APPROVED: 'rounded-md border-2 border-emerald-500 bg-background text-emerald-200',
    DENIED: 'rounded-md border-2 border-rose-500 bg-background text-rose-200',
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
    regenerating,
    denyDraft,
    onDenyDraftChange,
    onApprove,
    onDeny,
    onRegeneratePreview,
    onCopySlug,
}: RequestCardProps) {
    const links = getLinks(request.socialLinks);
    const [denyConfirmOpen, setDenyConfirmOpen] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
    const hasDenialReason = denyDraft.trim().length > 0;
    const hasConsentEvidence =
        request.publishConsentAccepted === true &&
        Boolean(request.publishConsentAcceptedAt) &&
        Boolean(request.publishConsentPolicyVersion?.trim());

    const handleCopySlug = async () => {
        const copied = await onCopySlug();
        setCopyState(copied ? 'copied' : 'failed');
        window.setTimeout(() => setCopyState('idle'), 1200);
    };

    return (
        <>
            <Card className="overflow-hidden border-2 border-border bg-card shadow-none transition-colors duration-200 motion-reduce:transition-none hover:border-foreground">
                <CardHeader className="gap-4 border-b-2 border-border bg-card pb-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="break-all text-base sm:text-lg">{request.title}</CardTitle>
                                <Badge className={statusStyles[request.status]}>{statusLabel[request.status]}</Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <code className="rounded-md border-2 border-primary bg-background px-2 py-1 font-mono text-primary">
                                    /s/{request.slug}
                                </code>
                                <span>Submitted {formatDate(request.createdAt)}</span>
                                {request.reviewedAt && <span>Reviewed {formatDate(request.reviewedAt)}</span>}
                            </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className={`border-2 transition-colors ${
                                    copyState === 'copied'
                                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 motion-safe:animate-pulse'
                                        : copyState === 'failed'
                                          ? 'border-destructive bg-destructive/10 text-destructive motion-safe:animate-pulse'
                                          : 'border-border'
                                }`}
                                onClick={() => void handleCopySlug()}
                            >
                                {copyState === 'copied' ? (
                                    <Check className="h-3.5 w-3.5" />
                                ) : (
                                    <ClipboardCopy className="h-3.5 w-3.5" />
                                )}
                                {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy slug'}
                            </Button>
                            {request.status === 'APPROVED' || request.status === 'PENDING' ? (
                                <Button variant="outline" size="sm" className="border-2 border-border" asChild>
                                    <a href={`/s/${request.slug}`} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Preview
                                    </a>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" className="border-2 border-border" disabled>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Preview
                                </Button>
                            )}
                        </div>
                    </div>

                </CardHeader>

                <CardContent className="space-y-6 py-5">
                    {request.description && (
                        <p className="rounded-lg border-2 border-border bg-background p-3 text-sm leading-6 text-muted-foreground">
                            {request.description}
                        </p>
                    )}

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                        <section className="space-y-4">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="rounded-lg border-2 border-border bg-background p-3">
                                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Author</p>
                                    <p className="mt-2 flex items-center gap-2 break-all text-sm">
                                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                                        {renderValue(request.authorName)}
                                    </p>
                                </div>
                                <div className="rounded-lg border-2 border-border bg-background p-3">
                                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">License</p>
                                    <p className="mt-2 text-sm">{renderValue(request.license)}</p>
                                </div>
                            </div>

                            <div className="rounded-lg border-2 border-border bg-background p-3">
                                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Code Payload</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="border-2 border-border bg-background text-muted-foreground">
                                        textmode {request.textmodeCode.length.toLocaleString()} chars
                                    </Badge>
                                    <Badge variant="outline" className="border-2 border-border bg-background text-muted-foreground">
                                        strudel{' '}
                                        {request.strudelCode
                                            ? `${request.strudelCode.length.toLocaleString()} chars`
                                            : 'not provided'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="rounded-lg border-2 border-border bg-background p-3">
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
                                                className="inline-flex items-center gap-1.5 rounded-md border-2 border-border bg-background px-2.5 py-1 text-xs transition-colors duration-200 motion-reduce:transition-none hover:bg-card"
                                            >
                                                <SocialIcon label={link.label} />
                                                <span>{link.label}</span>
                                                <Link2 className="h-3 w-3 text-muted-foreground" />
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-lg border-2 border-border bg-background p-3">
                                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Publish Consent</p>
                                {hasConsentEvidence ? (
                                    <div className="mt-2 space-y-2 text-sm">
                                        <Badge
                                            variant="outline"
                                            className="border-2 border-emerald-600 bg-emerald-950/20 text-emerald-300"
                                        >
                                            Consent recorded
                                        </Badge>
                                        <p className="text-muted-foreground">
                                            Accepted at {formatDate(request.publishConsentAcceptedAt)}
                                        </p>
                                        <p className="text-muted-foreground">
                                            Policy version{' '}
                                            <span className="font-mono text-foreground">{request.publishConsentPolicyVersion}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-2 space-y-2">
                                        <Badge
                                            variant="outline"
                                            className="border-2 border-amber-600 bg-amber-950/20 text-amber-300"
                                        >
                                            Missing consent evidence
                                        </Badge>
                                        <p className="text-sm text-muted-foreground">
                                            This is likely a legacy submission created before consent tracking was enforced.
                                            Review manually before approval.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3 rounded-lg border-2 border-border bg-background p-4">
                            <div className="overflow-hidden rounded-lg border-2 border-border bg-muted/30">                                                                 
                                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-background/50"> 
                                    {request.status === 'APPROVED' ? (
                                        request.ogImageUrl ? (
                                            <button
                                                type="button"
                                                onClick={() => setLightboxOpen(true)}
                                                className="h-full w-full cursor-zoom-in hover:cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                                title="View full size"
                                            >
                                                <img
                                                    src={request.ogImageUrl}
                                                    alt={`Preview for ${request.title}`}
                                                    className="h-full w-full object-cover transition-opacity duration-300 hover:opacity-90"
                                                />
                                            </button>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <ImageIcon className="h-8 w-8 opacity-50" />
                                                <span className="text-xs font-medium">Preview pending</span>
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                                            <span className="text-xs font-medium">
                                                Preview unavailable
                                            </span>
                                        </div>
                                    )}

                                    {request.status === 'APPROVED' && (
                                        <div className="absolute right-2 top-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 border border-border/50 bg-background/80 shadow-sm backdrop-blur-sm transition-all hover:bg-background"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent lightbox from opening
                                                    onRegeneratePreview();
                                                }}
                                                disabled={regenerating || loading}
                                            >
                                                <RefreshCw
                                                    className={`mr-2 h-3.5 w-3.5 ${
                                                        regenerating ? 'animate-spin' : ''
                                                    }`}
                                                />
                                                {regenerating ? 'Regenerating' : 'Regenerate'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

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
                                    className="min-h-[110px] resize-none border-2 border-input bg-background"
                                    maxLength={300}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    className="border-2 border-emerald-600 bg-background text-emerald-300 transition-colors duration-200 motion-reduce:transition-none hover:bg-emerald-950/30"
                                    onClick={onApprove}
                                    disabled={loading}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {loading ? 'Saving...' : 'Approve'}
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="border-2 border-destructive"
                                    onClick={() => setDenyConfirmOpen(true)}
                                    disabled={loading}
                                >
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
                        <Alert className="rounded-lg border-2 border-rose-500 bg-background">
                            <AlertTitle className="text-rose-200">Previous denial reason</AlertTitle>
                            <AlertDescription className="text-rose-100/90">{request.denialReason}</AlertDescription>
                        </Alert>
                    )}

                    {request.status === 'DENIED' && (
                        <Alert className="rounded-lg border-2 border-amber-500 bg-background">
                            <AlertTitle className="text-amber-200">Slug reusable</AlertTitle>
                            <AlertDescription className="text-amber-100/90">
                                <code className="border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 font-mono">
                                    /s/{request.slug}
                                </code>{' '}
                                can now be claimed by a new submission.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={request.ogImageUrl ? [{ src: request.ogImageUrl }] : []}
                render={{
                    buttonPrev: () => null,
                    buttonNext: () => null,
                    iconClose: () => (
                        <div className="flex items-center gap-4">
                            {request.ogImageUrl && (
                                <a
                                    href={request.ogImageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-white/80 transition-colors hover:text-white focus:outline-none"
                                    title="Open image in new tab"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="h-6 w-6" />
                                </a>
                            )}
                            <X className="h-8 w-8 text-white/80 transition-colors hover:text-white" />
                        </div>
                    ),
                }}
                styles={{
                    container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
                    slide: { padding: '80px 0' },
                }}
                controller={{ closeOnBackdropClick: true }}
            />

            <Dialog open={denyConfirmOpen} onOpenChange={setDenyConfirmOpen}>
                <DialogContent className="border-2 border-border sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Deny this submission?</DialogTitle>
                        <DialogDescription>
                            This action updates the gallery review status immediately and stores your denial reason.
                        </DialogDescription>
                    </DialogHeader>
                    {!hasDenialReason && (
                        <Alert className="border-2 border-destructive bg-background py-3">
                            <AlertDescription className="text-sm text-destructive">
                                Add a denial reason before confirming.
                            </AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button variant="outline" className="border-2 border-border" onClick={() => setDenyConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="border-2 border-destructive"
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
