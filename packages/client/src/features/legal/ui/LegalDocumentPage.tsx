import { ArrowLeft, MessageSquare } from 'lucide-react';
import { LegalLanguageToggle } from '@/features/legal/ui/LegalLanguageToggle';
import { useLegalLanguage } from '@/features/legal/hooks/useLegalLanguage';
import { useLegalSeo } from '@/features/legal/hooks/useLegalSeo';
import { getLegalUiCopy } from '@/features/legal/content/legalUiCopy';
import { LEGAL_DOCUMENT_ORDER, getLegalDocuments, type LegalDocumentId } from '@/features/legal/content/legalDocuments';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Separator } from '@/shared/ui/separator';
import { cn } from '@/shared/lib/cn';

interface LegalDocumentPageProps {
	documentId: LegalDocumentId;
}

export function LegalDocumentPage({ documentId }: LegalDocumentPageProps) {
	const { locale, setLocale, buildLocalizedLegalHref } = useLegalLanguage({
		syncUrlOnChange: true,
		syncDocumentLang: true,
	});
	const legalDocuments = getLegalDocuments(locale);
	const legalCopy = getLegalUiCopy(locale);
	const currentDocument = legalDocuments[documentId];
	const DocumentContent = currentDocument.Content;
	useLegalSeo(locale, currentDocument.path, currentDocument.title);

	return (
		<div className="w-full h-dvh overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/95 text-zinc-100">
			<div className="h-full max-w-4xl mx-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:px-6 sm:py-8 flex flex-col min-h-0">
				<div className="flex items-center justify-between gap-3 mb-4">
					<Button asChild variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800/60">
						<a href="/" aria-label={legalCopy.backToAppAriaLabel}>
							<ArrowLeft className="h-4 w-4" />
							{legalCopy.backToAppLabel}
						</a>
					</Button>
					<div className="flex items-center gap-2">
						<LegalLanguageToggle locale={locale} onLocaleChange={setLocale} />
					</div>
				</div>

				<Card className="flex-1 min-h-0 border-zinc-800/80 bg-zinc-900/70 backdrop-blur-sm shadow-xl">
					<CardHeader>
						<CardTitle className="text-xl sm:text-2xl text-zinc-100">{currentDocument.title}</CardTitle>
						<CardDescription className="text-zinc-400">{currentDocument.description}</CardDescription>
					</CardHeader>

					<CardContent className="min-h-0 flex-1 flex flex-col gap-4">
						<div className="relative flex items-center justify-between gap-3">
							<div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-900/70 to-transparent pointer-events-none z-10 sm:hidden" />
							<nav
								aria-label={legalCopy.legalPagesNavAriaLabel}
								className="flex items-center gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pr-6 sm:pr-0 sm:overflow-visible"
							>
								{LEGAL_DOCUMENT_ORDER.map((id) => {
									const doc = legalDocuments[id];
									const active = id === documentId;
									return (
										<Button
											key={id}
											asChild
											variant={active ? 'default' : 'outline'}
											size="sm"
											className={cn(
												'min-w-[6rem] flex-shrink-0 snap-start',
												active
													? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-400/40'
													: 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
											)}
										>
											<a href={buildLocalizedLegalHref(doc.path)}>{doc.navLabel}</a>
										</Button>
									);
								})}
								<Button
									asChild
									size="sm"
									className="min-w-[6rem] flex-shrink-0 snap-start bg-zinc-900/40 border border-white/10 text-zinc-300 hover:bg-zinc-800/60 hover:text-white sm:hidden"
								>
									<a href={buildLocalizedLegalHref('/contact')}>
										<MessageSquare className="w-4 h-4" />
										{legalCopy.contactLabel}
									</a>
								</Button>
							</nav>
							<Button
								asChild
								size="sm"
								className="hidden sm:inline-flex bg-zinc-900/40 border border-white/10 text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
							>
								<a href={buildLocalizedLegalHref('/contact')}>
									<MessageSquare className="w-4 h-4" />
									{legalCopy.contactLabel}
								</a>
							</Button>
						</div>

						<Separator className="bg-zinc-800" />

						<ScrollArea className="min-h-0 flex-1 pr-4">
							<section lang={locale}>
								<DocumentContent className="text-zinc-300" />
							</section>
						</ScrollArea>

						<Separator className="bg-zinc-800" />

						<div className="rounded-lg border border-white/5 bg-zinc-950/40 p-3 text-xs text-zinc-500 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p className="leading-relaxed">
								(c) {new Date().getFullYear()} synth.textmode.art 
							</p>
							<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
								<a href={buildLocalizedLegalHref('/imprint')} className="text-zinc-400 hover:text-zinc-200 transition-colors">
									{legalCopy.footer.imprint}
								</a>
								<a href={buildLocalizedLegalHref('/tos')} className="text-zinc-400 hover:text-zinc-200 transition-colors">
									{legalCopy.footer.terms}
								</a>
								<a href={buildLocalizedLegalHref('/privacy')} className="text-zinc-400 hover:text-zinc-200 transition-colors">
									{legalCopy.footer.privacy}
								</a>
								<a href={buildLocalizedLegalHref('/contact')} className="text-zinc-400 hover:text-zinc-200 transition-colors">
									{legalCopy.footer.contact}
								</a>
							</div>
						</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
