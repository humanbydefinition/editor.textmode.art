import { ArrowLeft } from 'lucide-react';
import { LEGAL_DOCUMENT_ORDER, LEGAL_DOCUMENTS, type LegalDocumentId } from '@/features/legal/content/legalDocuments';
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
	const currentDocument = LEGAL_DOCUMENTS[documentId];
	const DocumentContent = currentDocument.Content;

	return (
		<div className="w-full h-screen overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/95 text-zinc-100">
			<div className="h-full max-w-4xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
				<div className="flex items-center justify-between gap-3 mb-4">
					<Button asChild variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800/60">
						<a href="/" aria-label="Return to synth.textmode.art app">
							<ArrowLeft className="h-4 w-4" />
							Back to App
						</a>
					</Button>
					<Badge variant="secondary" className="bg-zinc-800/70 text-zinc-300 border border-zinc-700/80">
						Legal
					</Badge>
				</div>

				<Card className="h-[calc(100%-3.5rem)] border-zinc-800/80 bg-zinc-900/70 backdrop-blur-sm shadow-xl">
					<CardHeader>
						<CardTitle className="text-xl sm:text-2xl text-zinc-100">{currentDocument.title}</CardTitle>
						<CardDescription className="text-zinc-400">{currentDocument.description}</CardDescription>
					</CardHeader>

					<CardContent className="min-h-0 flex-1 flex flex-col gap-4">
						<nav aria-label="Legal pages navigation" className="flex flex-wrap items-center gap-2">
							{LEGAL_DOCUMENT_ORDER.map((id) => {
								const doc = LEGAL_DOCUMENTS[id];
								const active = id === documentId;
								return (
									<Button
										key={id}
										asChild
										variant={active ? 'default' : 'outline'}
										size="sm"
										className={cn(
											'min-w-[6rem]',
											active
												? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-400/40'
												: 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
										)}
									>
										<a href={doc.path}>{doc.navLabel}</a>
									</Button>
								);
							})}
						</nav>

						<Separator className="bg-zinc-800" />

						<ScrollArea className="min-h-0 flex-1 pr-4">
							<DocumentContent className="text-zinc-300" />
						</ScrollArea>

						<Separator className="bg-zinc-800" />

						<div className="flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
							<p>
								© {new Date().getFullYear()} synth.textmode.art. AGPL-3.0-or-later. 
								<br />
								All third-party marks remain
								the property of their respective owners.
							</p>
							<div className="flex items-center gap-3">
								<a href="/imprint" className="text-zinc-400 hover:text-zinc-200 transition-colors">
									Imprint
								</a>
								<a href="/tos" className="text-zinc-400 hover:text-zinc-200 transition-colors">
									Terms
								</a>
								<a href="/privacy" className="text-zinc-400 hover:text-zinc-200 transition-colors">
									Privacy
								</a>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
