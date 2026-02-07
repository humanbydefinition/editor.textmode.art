import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { SlugInfoCard } from '@/components/SlugInfoCard';
import { PublishRequestSuccessDialog } from './PublishRequestSuccessDialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';
import {
    checkSlugAvailability,
    submitSketchRequest,
} from '@/services/SketchApiService';
import type { SocialLink } from '@synth.textmode.art/contracts/sketch';
import {
    Check,
    Loader2,
    X,
    Send,
    Link2,
    AlertCircle,
    Globe,
} from 'lucide-react';

const LICENSE_OPTIONS = [
    'CC BY 4.0',
    'CC BY-SA 4.0',
    'CC BY-NC 4.0',
    'CC0 1.0',
    'MIT',
    'Apache-2.0',
    'GPL-3.0',
] as const;

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
    const [license, setLicense] = useState<(typeof LICENSE_OPTIONS)[number]>('CC BY 4.0');
    const [website, setWebsite] = useState('');
    const [github, setGithub] = useState('');
    const [instagram, setInstagram] = useState('');
    const [bluesky, setBluesky] = useState('');
    const [mastodon, setMastodon] = useState('');
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
            setLicense('CC BY 4.0');
            setWebsite('');
            setGithub('');
            setInstagram('');
            setBluesky('');
            setMastodon('');
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

    /** Build social links array from the fixed platform fields */
    const socialLinks = useMemo((): SocialLink[] => {
        const links: SocialLink[] = [];
        if (website.trim()) links.push({ label: 'Website', url: website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}` });
        if (github.trim()) links.push({ label: 'GitHub', url: `https://github.com/${github.trim().replace(/^@/, '')}` });
        if (instagram.trim()) links.push({ label: 'Instagram', url: `https://instagram.com/${instagram.trim().replace(/^@/, '')}` });
        if (bluesky.trim()) links.push({ label: 'Bluesky', url: `https://bsky.app/profile/${bluesky.trim().replace(/^@/, '')}` });
        if (mastodon.trim()) links.push({ label: 'Mastodon', url: mastodon.trim().startsWith('http') ? mastodon.trim() : `https://${mastodon.trim()}` });
        return links;
    }, [website, github, instagram, bluesky, mastodon]);

    const isFormValid = useMemo(() => {
        return (
            slug.available === true &&
            title.trim().length > 0 &&
            title.trim().length <= 120 &&
            description.length <= 200 &&
            authorName.length <= 32
        );
    }, [slug.available, title, description, authorName]);

    const previewSketch = useMemo(() => {
        const normalizedPreviewSlug = (slug.normalized || slug.value || 'your-sketch')
            .replace(/^-+|-+$/g, '');
        return {
            slug: normalizedPreviewSlug || 'your-sketch',
            title: title.trim() || 'untitled sketch',
            description: description.trim() || null,
            authorName: authorName.trim() || null,
            license: license || null,
            socialLinks: socialLinks.length > 0 ? socialLinks : null,
        };
    }, [slug.normalized, slug.value, title, description, authorName, license, socialLinks]);

    const handleSubmit = useCallback(async () => {
        if (!data || !isFormValid) return;

        setSubmitStatus('submitting');
        setSubmitError(null);

        const result = await submitSketchRequest({
            slug: slug.normalized || slug.value,
            title: title.trim(),
            description: description.trim() || null,
            authorName: authorName.trim() || null,
            license: license || null,
            socialLinks: socialLinks.length > 0 ? socialLinks : null,
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
    const isSuccess = submitStatus === 'success';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={
                isSuccess
                    ? 'sm:max-w-[480px] bg-zinc-950/98 backdrop-blur-2xl border-white/10'
                    : 'sm:max-w-[560px] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden h-[85vh] sm:h-[680px] flex flex-col'
            }>
                {isSuccess ? (
                    <PublishRequestSuccessDialog
                        submittedSlug={submittedSlug}
                        onClose={() => onOpenChange(false)}
                    />
                ) : (
                    <>
                <DialogHeader className="px-6 py-4 border-b border-white/5 text-left shrink-0">
                    <DialogTitle className="text-lg font-bold tracking-tight text-white">
                        publish to gallery
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-400">
                        submit your sketch to the community gallery. once approved, it will
                        get its own SEO-friendly URL and be discoverable by others.
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 min-h-0">
                    <div className="px-6 py-5 space-y-5">
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
                            maxLength={200}
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
                            maxLength={32}
                        />
                    </div>

                    {/* License selection */}
                    <div className="space-y-2">
                        <Label className="text-sm text-zinc-300">
                            license <span className="text-red-400">*</span>
                        </Label>
                        <Select
                            value={license}
                            onValueChange={(value: string) => setLicense(value as (typeof LICENSE_OPTIONS)[number])}
                        >
                            <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                                <SelectValue placeholder="Select a license" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-white/10">
                                {LICENSE_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option} className="text-zinc-200">
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-zinc-500">
                            choose the license under which your sketch will be shared in the gallery.
                        </p>
                    </div>

                    {/* Social links - fixed platforms */}
                    <div className="space-y-3">
                        <Label className="text-sm text-zinc-300">
                            social links <span className="text-zinc-500">(all optional)</span>
                        </Label>

                        {/* Website */}
                        <div className="flex items-center gap-2">
                            <span className="w-7 flex justify-center shrink-0">
                                <Globe className="w-4 h-4 text-zinc-400" />
                            </span>
                            <Input
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                placeholder="yoursite.com"
                                className="flex-1 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                maxLength={200}
                            />
                        </div>

                        {/* GitHub */}
                        <div className="flex items-center gap-2">
                            <span className="w-7 flex justify-center shrink-0">
                                <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                            </span>
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">github.com/</span>
                                <Input
                                    value={github}
                                    onChange={(e) => setGithub(e.target.value.replace(/\s/g, ''))}
                                    placeholder="username"
                                    className="pl-[6.5rem] bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                    maxLength={39}
                                />
                            </div>
                        </div>

                        {/* Instagram */}
                        <div className="flex items-center gap-2">
                            <span className="w-7 flex justify-center shrink-0">
                                <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                            </span>
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                                <Input
                                    value={instagram}
                                    onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
                                    placeholder="username"
                                    className="pl-7 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                    maxLength={30}
                                />
                            </div>
                        </div>

                        {/* Bluesky */}
                        <div className="flex items-center gap-2">
                            <span className="w-7 flex justify-center shrink-0">
                                <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.585 3.493 6.18 3.254-.02.028-3.876.89-3.876 3.636 0 4.063 5.572 4.396 7.476 1.281.354-.578.598-1.258.598-2.068 0 .81.244 1.49.598 2.068 1.904 3.115 7.476 2.782 7.476-1.281 0-2.747-3.856-3.608-3.876-3.636 2.595.239 5.395-.627 6.18-3.254.246-.828.624-5.788.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.299-1.664-.621-4.3 1.24C14.046 4.747 11.087 8.686 12 10.8z"/></svg>
                            </span>
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                                <Input
                                    value={bluesky}
                                    onChange={(e) => setBluesky(e.target.value.replace(/\s/g, ''))}
                                    placeholder="handle.bsky.social"
                                    className="pl-7 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                    maxLength={100}
                                />
                            </div>
                        </div>

                        {/* Mastodon */}
                        <div className="flex items-center gap-2">
                            <span className="w-7 flex justify-center shrink-0">
                                <svg
                                    className="w-4 h-4 text-zinc-400"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    role="img"
                                    aria-label="Mastodon"
                                >
                                    <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
                                </svg>
                            </span>
                            <Input
                                value={mastodon}
                                onChange={(e) => setMastodon(e.target.value.replace(/\s/g, ''))}
                                placeholder="@user@mastodon.social"
                                className="flex-1 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                maxLength={200}
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                        <Label className="text-sm text-zinc-300">slug info preview</Label>
                        <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-3">
                            <p className="text-xs text-zinc-500 mb-2">how this card appears once approved:</p>
                            <p className="text-sm font-mono text-emerald-300 flex items-center gap-2 mb-3">
                                <Link2 className="w-4 h-4" />
                                synth.textmode.art/s/{previewSketch.slug}
                            </p>
                            <div className="rounded-md border border-white/5 bg-zinc-950/40 p-3">
                                <div className="w-full max-w-[360px]">
                                    <SlugInfoCard
                                        sketch={previewSketch}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error message */}
                    {submitStatus === 'error' && submitError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300">{submitError}</p>
                        </div>
                    )}
                    </div>
                </ScrollArea>

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
                                publish to gallery
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-zinc-500 text-center mt-2">
                        submissions are reviewed manually before going live in the gallery
                    </p>
                </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
