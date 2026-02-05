import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    checkSlugAvailability,
    submitSketchRequest,
    type SocialLink,
} from '@/services/SketchApiService';
import {
    Check,
    Loader2,
    X,
    Plus,
    Trash2,
    Send,
    Link2,
    AlertCircle,
} from 'lucide-react';

export interface PublishRequestData {
    textmodeCode: string;
    strudelCode?: string | null;
}

export interface PublishRequestDialogProps {
    open: boolean;
    data: PublishRequestData | null;
    onOpenChange: (open: boolean) => void;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

interface SlugState {
    value: string;
    normalized: string;
    checking: boolean;
    available: boolean | null;
    reason?: string;
}

export function PublishRequestDialog({
    open,
    data,
    onOpenChange,
}: PublishRequestDialogProps) {
    // Form state
    const [slug, setSlug] = useState<SlugState>({
        value: '',
        normalized: '',
        checking: false,
        available: null,
    });
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submittedSlug, setSubmittedSlug] = useState<string | null>(null);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setSlug({ value: '', normalized: '', checking: false, available: null });
            setTitle('');
            setDescription('');
            setAuthorName('');
            setSocialLinks([]);
            setSubmitStatus('idle');
            setSubmitError(null);
            setSubmittedSlug(null);
        }
    }, [open]);

    // Debounced slug availability check
    useEffect(() => {
        if (!slug.value.trim()) {
            setSlug((s) => ({ ...s, normalized: '', checking: false, available: null, reason: undefined }));
            return;
        }

        setSlug((s) => ({ ...s, checking: true }));

        const timer = setTimeout(async () => {
            const result = await checkSlugAvailability(slug.value);
            setSlug((s) => ({
                ...s,
                normalized: result.slug,
                checking: false,
                available: result.available,
                reason: result.reason,
            }));
        }, 400);

        return () => clearTimeout(timer);
    }, [slug.value]);

    const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        setSlug((s) => ({ ...s, value, available: null, reason: undefined }));
    }, []);

    const addSocialLink = useCallback(() => {
        if (socialLinks.length < 6) {
            setSocialLinks((links) => [...links, { label: '', url: '' }]);
        }
    }, [socialLinks.length]);

    const removeSocialLink = useCallback((index: number) => {
        setSocialLinks((links) => links.filter((_, i) => i !== index));
    }, []);

    const updateSocialLink = useCallback(
        (index: number, field: 'label' | 'url', value: string) => {
            setSocialLinks((links) =>
                links.map((link, i) => (i === index ? { ...link, [field]: value } : link))
            );
        },
        []
    );

    const isFormValid = useMemo(() => {
        return (
            slug.available === true &&
            title.trim().length > 0 &&
            title.trim().length <= 120 &&
            description.length <= 300 &&
            authorName.length <= 80 &&
            socialLinks.every(
                (link) =>
                    link.label.trim().length > 0 &&
                    link.label.length <= 32 &&
                    link.url.trim().length > 0 &&
                    link.url.length <= 200
            )
        );
    }, [slug.available, title, description, authorName, socialLinks]);

    const handleSubmit = useCallback(async () => {
        if (!data || !isFormValid) return;

        setSubmitStatus('submitting');
        setSubmitError(null);

        const validLinks = socialLinks.filter(
            (link) => link.label.trim() && link.url.trim()
        );

        const result = await submitSketchRequest({
            slug: slug.normalized || slug.value,
            title: title.trim(),
            description: description.trim() || null,
            authorName: authorName.trim() || null,
            socialLinks: validLinks.length > 0 ? validLinks : null,
            textmodeCode: data.textmodeCode,
            strudelCode: data.strudelCode ?? null,
        });

        if (result.success) {
            setSubmitStatus('success');
            setSubmittedSlug(result.data.slug);
        } else {
            setSubmitStatus('error');
            setSubmitError(result.error);
        }
    }, [data, isFormValid, slug, title, description, authorName, socialLinks]);

    if (!data) return null;

    // Success state
    if (submitStatus === 'success') {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[480px] bg-zinc-950/98 backdrop-blur-2xl border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <Check className="w-5 h-5 text-emerald-400" />
                            request submitted
                        </DialogTitle>
                        <DialogDescription className="text-sm text-zinc-400">
                            your sketch is pending review
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                            <p className="text-sm text-zinc-300">
                                your custom link request for{' '}
                                <span className="font-mono text-emerald-300">/s/{submittedSlug}</span>{' '}
                                has been submitted for moderation.
                            </p>
                            <p className="text-xs text-zinc-500 mt-2">
                                once approved, your sketch will be live at the custom URL with full SEO support.
                            </p>
                        </div>

                        <Button
                            className="w-full bg-zinc-800 border border-white/10 text-zinc-200 hover:bg-zinc-700"
                            onClick={() => onOpenChange(false)}
                        >
                            close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <DialogHeader className="px-6 py-4 border-b border-white/5 text-left shrink-0">
                    <DialogTitle className="text-lg font-bold tracking-tight text-white">
                        request custom link
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-400">
                        submit your sketch for a short, SEO-friendly URL. requires moderation.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                    {/* Slug input */}
                    <div className="space-y-2">
                        <Label htmlFor="slug" className="text-sm text-zinc-300">
                            custom slug <span className="text-red-400">*</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                                /s/
                            </span>
                            <Input
                                id="slug"
                                value={slug.value}
                                onChange={handleSlugChange}
                                placeholder="my-sketch"
                                className="pl-10 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                maxLength={60}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {slug.checking && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
                                {!slug.checking && slug.available === true && (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                )}
                                {!slug.checking && slug.available === false && (
                                    <X className="w-4 h-4 text-red-400" />
                                )}
                            </div>
                        </div>
                        {slug.normalized && slug.normalized !== slug.value && (
                            <p className="text-xs text-zinc-500">
                                will be normalized to: <span className="font-mono text-zinc-400">{slug.normalized}</span>
                            </p>
                        )}
                        {slug.reason && (
                            <p className="text-xs text-red-400">{slug.reason}</p>
                        )}
                        {slug.available === true && (
                            <p className="text-xs text-emerald-400">slug is available!</p>
                        )}
                    </div>

                    {/* Title input */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm text-zinc-300">
                            title <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="My Awesome Sketch"
                            className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                            maxLength={120}
                        />
                        <p className="text-xs text-zinc-500">{title.length}/120 characters</p>
                    </div>

                    {/* Description input */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm text-zinc-300">
                            description <span className="text-zinc-500">(optional)</span>
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A brief description of your sketch for social previews..."
                            className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 min-h-[80px] resize-none"
                            maxLength={300}
                        />
                        <p className="text-xs text-zinc-500">{description.length}/300 characters</p>
                    </div>

                    {/* Author input */}
                    <div className="space-y-2">
                        <Label htmlFor="author" className="text-sm text-zinc-300">
                            author name <span className="text-zinc-500">(optional)</span>
                        </Label>
                        <Input
                            id="author"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            placeholder="Your name or handle"
                            className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                            maxLength={80}
                        />
                    </div>

                    {/* Social links */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm text-zinc-300">
                                social links <span className="text-zinc-500">(optional, max 6)</span>
                            </Label>
                            {socialLinks.length < 6 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={addSocialLink}
                                    className="text-xs text-zinc-400 hover:text-white"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    add link
                                </Button>
                            )}
                        </div>

                        {socialLinks.map((link, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <Input
                                    value={link.label}
                                    onChange={(e) => updateSocialLink(index, 'label', e.target.value)}
                                    placeholder="Label"
                                    className="w-24 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                    maxLength={32}
                                />
                                <Input
                                    value={link.url}
                                    onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                    maxLength={200}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeSocialLink(index)}
                                    className="shrink-0 text-zinc-500 hover:text-red-400"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Preview */}
                    {slug.available === true && (
                        <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-3">
                            <p className="text-xs text-zinc-500 mb-1">your sketch will be available at:</p>
                            <p className="text-sm font-mono text-emerald-300 flex items-center gap-2">
                                <Link2 className="w-4 h-4" />
                                synth.textmode.art/s/{slug.normalized || slug.value}
                            </p>
                        </div>
                    )}

                    {/* Error message */}
                    {submitStatus === 'error' && submitError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300">{submitError}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 shrink-0">
                    <Button
                        disabled={!isFormValid || submitStatus === 'submitting'}
                        className="w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
                        onClick={handleSubmit}
                    >
                        {submitStatus === 'submitting' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                submit for review
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-zinc-500 text-center mt-2">
                        submissions are reviewed manually before going live
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
