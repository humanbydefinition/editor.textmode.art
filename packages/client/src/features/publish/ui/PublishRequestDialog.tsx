import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Checkbox } from '@/shared/ui/checkbox';
import { SlugInfoCard } from '@/shared/components/SlugInfoCard';
import { PublishRequestSuccessDialog } from './PublishRequestSuccessDialog';
import { TurnstileWidget } from './TurnstileWidget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
	checkSlugAvailability,
	fetchSketchSubmissionQueueStatus,
	submitSketchRequest,
} from '@/platform/api/SketchApiService';
import { SLUG_MAX_LENGTH } from '@synth.textmode.art/contracts/sketch';
import type { SocialLink } from '@synth.textmode.art/contracts/sketch';
import { SocialIcon } from '@/shared/components/SocialIcon';
import { Check, Loader2, X, Send, AlertCircle, ExternalLink } from 'lucide-react';

const LICENSE_OPTIONS = [
	'None',
	'CC BY 4.0',
	'CC BY-SA 4.0',
	'CC BY-ND 4.0',
	'CC BY-NC 4.0',
	'CC BY-NC-SA 4.0',
	'CC BY-NC-ND 4.0',
] as const;

const LICENSE_LABELS: Record<(typeof LICENSE_OPTIONS)[number], string> = {
	None: 'No CreativeCommons License',
	'CC BY 4.0': 'Attribution',
	'CC BY-SA 4.0': 'Attribution ShareAlike',
	'CC BY-ND 4.0': 'Attribution NoDerivatives',
	'CC BY-NC 4.0': 'Attribution NonCommercial',
	'CC BY-NC-SA 4.0': 'Attribution NonCommercial ShareAlike',
	'CC BY-NC-ND 4.0': 'Attribution NonCommercial NoDerivatives',
};

const DEFAULT_PUBLISH_CONSENT_POLICY_VERSION = '2026-02-08';

function getPublishConsentPolicyVersion(): string {
	const fromEnv = String(import.meta.env.VITE_PUBLISH_CONSENT_POLICY_VERSION ?? '').trim();
	return fromEnv.length > 0 ? fromEnv : DEFAULT_PUBLISH_CONSENT_POLICY_VERSION;
}

const PUBLISH_CONSENT_POLICY_VERSION = getPublishConsentPolicyVersion();
const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim();
const TURNSTILE_CONFIGURED = TURNSTILE_SITE_KEY.length > 0;
function normalizeMastodonUrl(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return '';

	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return trimmed;
	}

	const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
	const [user, host] = handle.split('@');
	if (user && host) {
		return `https://${host}/@${user}`;
	}

	return `https://${trimmed}`;
}

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

interface SubmissionQueueState {
	loading: boolean;
	full: boolean;
}

export function PublishRequestDialog({ open, data, onOpenChange }: PublishRequestDialogProps) {
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
	const [publishConsentAccepted, setPublishConsentAccepted] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [turnstileError, setTurnstileError] = useState<string | null>(null);
	const [turnstileResetNonce, setTurnstileResetNonce] = useState(0);
	const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submittedSlug, setSubmittedSlug] = useState<string | null>(null);
	const [submissionQueue, setSubmissionQueue] = useState<SubmissionQueueState>({
		loading: false,
		full: false,
	});

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
			setPublishConsentAccepted(false);
			setTurnstileToken(null);
			setTurnstileError(null);
			setTurnstileResetNonce((value) => value + 1);
			setSubmitStatus('idle');
			setSubmitError(null);
			setSubmittedSlug(null);
			setSubmissionQueue({
				loading: true,
				full: false,
			});

			void (async () => {
				const queueStatus = await fetchSketchSubmissionQueueStatus();
				if (!queueStatus) {
					setSubmissionQueue({
						loading: false,
						full: false,
					});
					return;
				}

				setSubmissionQueue({
					loading: false,
					full: queueStatus.full,
				});
			})();
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
		if (website.trim())
			links.push({
				label: 'Website',
				url: website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`,
			});
		if (github.trim())
			links.push({ label: 'GitHub', url: `https://github.com/${github.trim().replace(/^@/, '')}` });
		if (instagram.trim())
			links.push({ label: 'Instagram', url: `https://instagram.com/${instagram.trim().replace(/^@/, '')}` });
		if (bluesky.trim())
			links.push({ label: 'Bluesky', url: `https://bsky.app/profile/${bluesky.trim().replace(/^@/, '')}` });
		if (mastodon.trim())
			links.push({
				label: 'Mastodon',
				url: normalizeMastodonUrl(mastodon),
			});
		return links;
	}, [website, github, instagram, bluesky, mastodon]);

	const isFormValid = useMemo(() => {
		return (
			slug.available === true &&
			title.trim().length > 0 &&
			title.trim().length <= 120 &&
			description.length <= 200 &&
			authorName.length <= 32 &&
			publishConsentAccepted &&
			TURNSTILE_CONFIGURED &&
			Boolean(turnstileToken) &&
			!submissionQueue.full
		);
	}, [slug.available, title, description, authorName, publishConsentAccepted, turnstileToken, submissionQueue.full]);

	const previewSketch = useMemo(() => {
		const normalizedPreviewSlug = (slug.normalized || slug.value || 'your-sketch').replace(/^-+|-+$/g, '');
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
		if (!turnstileToken) {
			setSubmitStatus('error');
			setSubmitError('Complete the security verification before submitting.');
			return;
		}

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
			publishConsent: {
				accepted: true,
				policyVersion: PUBLISH_CONSENT_POLICY_VERSION,
			},
			turnstileToken,
		});

		if (result.success) {
			setSubmitStatus('success');
			setSubmittedSlug(result.data.slug);
		} else {
			setSubmitStatus('error');
			setSubmitError(result.error);
			setTurnstileToken(null);
			setTurnstileResetNonce((value) => value + 1);
		}
	}, [data, isFormValid, slug, title, description, authorName, license, socialLinks, turnstileToken]);

	if (!data) return null;
	const isSuccess = submitStatus === 'success';

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={
					isSuccess
						? 'sm:max-w-[480px] bg-zinc-950/98 backdrop-blur-2xl border-white/10'
						: 'sm:max-w-[560px] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden h-[85vh] sm:h-[680px] flex flex-col'
				}
			>
				{isSuccess ? (
					<PublishRequestSuccessDialog submittedSlug={submittedSlug} onClose={() => onOpenChange(false)} />
				) : (
					<>
						<DialogHeader className="px-6 py-4 border-b border-white/5 text-left shrink-0">
							<DialogTitle className="text-lg font-bold tracking-tight text-white">
								publish to gallery
							</DialogTitle>
							<DialogDescription className="text-sm text-zinc-400">
								submit your sketch to the community gallery. once approved, it will get its own
								SEO-friendly URL and be discoverable by others.
							</DialogDescription>
						</DialogHeader>

						<ScrollArea className="flex-1 min-h-0 min-w-0">
							<div className="px-6 py-5 space-y-5 min-w-0">
								{submissionQueue.full && (
									<div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
										<p className="text-sm text-red-300">
											submission queue is currently full. please try again later.
										</p>
									</div>
								)}

								{/* Slug input */}
								<div className="space-y-2">
									<Label htmlFor="slug" className="text-sm text-zinc-300">
										custom slug <span className="text-red-400">*</span>
									</Label>
									<div className="relative min-w-0">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
											/s/
										</span>
										<Input
											id="slug"
											value={slug.value}
											onChange={handleSlugChange}
											placeholder="my-sketch"
											className="pl-10 pr-10 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
											maxLength={SLUG_MAX_LENGTH}
										/>
										<div className="absolute right-3 top-1/2 -translate-y-1/2">
											{slug.checking && (
												<Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
											)}
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
											will be normalized to:{' '}
											<span className="font-mono text-zinc-400 break-all">{slug.normalized}</span>
										</p>
									)}
									{slug.reason && <p className="text-xs text-red-400">{slug.reason}</p>}
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
										className="field-sizing-fixed min-w-0 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 min-h-[80px] resize-none"
										maxLength={200}
									/>
									<p className="text-xs text-zinc-500">{description.length}/200 characters</p>
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
										placeholder="your name or handle"
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
										onValueChange={(value: string) =>
											setLicense(value as (typeof LICENSE_OPTIONS)[number])
										}
									>
										<SelectTrigger className="bg-zinc-900 border-white/10 text-white text-left h-11 py-2">
											<SelectValue placeholder="Select a license" />
										</SelectTrigger>
										<SelectContent className="bg-zinc-950 border-white/10">
											{LICENSE_OPTIONS.map((option) => (
												<SelectItem key={option} value={option} className="text-zinc-200">
													<div className="flex flex-col">
														<span>{option}</span>
														<span className="text-[10px] text-zinc-500">
															{LICENSE_LABELS[option]}
														</span>
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<div className="px-0.5">
										<p className="text-[11px] text-zinc-500 leading-relaxed">
											choose the license under which your sketch will be shared in the gallery.
											this determines how others can use and build upon your work.
										</p>
										<a
											href="https://creativecommons.org/licenses/"
											target="_blank"
											rel="noopener noreferrer"
											className="text-[11px] text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1"
										>
											learn more about creative commons
											<ExternalLink className="w-3 h-3" />
										</a>
									</div>
								</div>

								{/* Social links - fixed platforms */}
								<div className="space-y-3">
									<Label className="text-sm text-zinc-300">
										social links <span className="text-zinc-500">(all optional)</span>
									</Label>

									{/* Website */}
									<div className="flex items-center gap-2">
										<span className="w-7 flex justify-center shrink-0">
											<SocialIcon label="Website" className="w-4 h-4 text-zinc-400" />
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
											<SocialIcon label="GitHub" className="w-4 h-4 text-zinc-400" />
										</span>
										<div className="flex-1 relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
												github.com/
											</span>
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
											<SocialIcon label="Instagram" className="w-4 h-4 text-zinc-400" />
										</span>
										<div className="flex-1 relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
												@
											</span>
											<Input
												value={instagram}
												onChange={(e) =>
													setInstagram(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))
												}
												placeholder="username"
												className="pl-7 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
												maxLength={30}
											/>
										</div>
									</div>

									{/* Bluesky */}
									<div className="flex items-center gap-2">
										<span className="w-7 flex justify-center shrink-0">
											<SocialIcon label="Bluesky" className="w-4 h-4 text-zinc-400" />
										</span>
										<div className="flex-1 relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
												@
											</span>
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
											<SocialIcon label="Mastodon" className="w-4 h-4 text-zinc-400" />
										</span>
										<Input
											value={mastodon}
											onChange={(e) => setMastodon(e.target.value.replace(/\s/g, ''))}
											placeholder="humanbydefinition@mastodon.social"
											className="flex-1 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
											maxLength={200}
										/>
									</div>
								</div>

								{/* Preview */}
								<div className="space-y-2">
									<Label className="text-sm text-zinc-300">slug info preview</Label>
									<div className="rounded-lg border border-white/10 bg-zinc-900/40 p-3">
										<p className="text-xs text-zinc-500 mb-2">
											how this card appears once approved:
										</p>
										<div className="w-full max-w-[360px] min-w-0">
											<SlugInfoCard sketch={previewSketch} />
										</div>
									</div>
								</div>

								{/* Publish consent */}
								<div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
									<div className="flex items-start gap-2">
										<Checkbox
											id="publish-consent"
											checked={publishConsentAccepted}
											onChange={(event) => setPublishConsentAccepted(event.currentTarget.checked)}
											className="mt-0.5"
										/>
										<div className="space-y-1">
											<Label
												htmlFor="publish-consent"
												className="text-sm text-zinc-200 cursor-pointer"
											>
												I confirm publication consent <span className="text-red-400">*</span>
											</Label>
											<p className="text-xs text-zinc-400 leading-relaxed">
												If approved, this submission can be publicly listed in the gallery and
												shared via a public URL. Any optional author name or social links I
												provide may be shown publicly.
											</p>
											<p className="text-[11px] text-zinc-500">
												Policy version:{' '}
												<span className="font-mono text-zinc-400">
													{PUBLISH_CONSENT_POLICY_VERSION}
												</span>
											</p>
											<p className="text-[11px] text-zinc-500 leading-relaxed">
												By confirming publication consent and publishing, you agree to the{' '}
												<a
													href="/tos?lang=en"
													target="_blank"
													rel="noopener noreferrer"
													className="text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2"
												>
													Terms &amp; Acceptable Use
												</a>{' '}
												and acknowledge the{' '}
												<a
													href="/privacy?lang=en"
													target="_blank"
													rel="noopener noreferrer"
													className="text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2"
												>
													Privacy Policy
												</a>
												.
											</p>
										</div>
									</div>
								</div>

								<div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2">
									<Label className="text-sm text-zinc-200">
										security verification <span className="text-red-400">*</span>
									</Label>
									{TURNSTILE_CONFIGURED ? (
										<>
											<TurnstileWidget
												siteKey={TURNSTILE_SITE_KEY}
												resetNonce={turnstileResetNonce}
												onTokenChange={setTurnstileToken}
												onErrorChange={setTurnstileError}
												className="flex justify-start"
											/>
											<p className="text-xs text-zinc-500">
												this check helps protect the gallery from automated abuse.
											</p>
											{turnstileError && <p className="text-xs text-red-400">{turnstileError}</p>}
											{turnstileToken && !turnstileError && (
												<p className="text-xs text-emerald-400">
													verification complete.
												</p>
											)}
										</>
									) : (
										<p className="text-xs text-red-300">
											security verification is not configured. publishing is currently
											unavailable.
										</p>
									)}
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
