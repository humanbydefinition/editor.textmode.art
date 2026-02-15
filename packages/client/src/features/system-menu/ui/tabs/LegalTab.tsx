import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/cn';
import { getLegalDocuments, type LegalDocumentId } from '@/features/legal/content/legalDocuments';
import { getLegalSectionLabel, getLegalUiCopy } from '@/features/legal/content/legalUiCopy';
import { useLegalLanguage } from '@/features/legal/hooks/useLegalLanguage';
import { LegalLanguageToggle } from '@/features/legal/ui/LegalLanguageToggle';
import { ContactDialog } from './ContactDialog';

export function LegalTab() {
	const { locale, setLocale, buildLocalizedLegalHref } = useLegalLanguage();
	const legalDocuments = getLegalDocuments(locale);
	const legalCopy = getLegalUiCopy(locale);
	const [openSection, setOpenSection] = useState<LegalDocumentId | null>(null);

	const toggleSection = (section: LegalDocumentId) => {
		setOpenSection((currentSection) => (currentSection === section ? null : section));
	};

	return (
		<div className="h-full flex flex-col px-6 pt-6 gap-3 overflow-hidden">
			<div className="flex items-center gap-2 shrink-0">
				<div className="flex-1 min-w-0">
					<ContactDialog buttonClassName="h-[34px] py-0" />
				</div>
				<LegalLanguageToggle locale={locale} onLocaleChange={setLocale} />
			</div>

			<div className="relative">
				<button
					onClick={() => toggleSection('imprint')}
					className={cn(
						'flex items-center justify-between w-full px-4 py-3 pr-14 text-sm shrink-0',
						'border border-white/5 rounded-lg',
						'transition-colors duration-200',
						openSection === 'imprint'
							? 'text-white bg-zinc-800/60 rounded-b-none border-b-0'
							: 'text-zinc-300 bg-zinc-900/30 hover:text-white hover:bg-zinc-900/50'
					)}
				>
					<span className="font-medium">{getLegalSectionLabel(locale, 'imprint')}</span>
					<ChevronDown
						className={cn(
							'w-4 h-4 transition-transform duration-300 ease-out',
							openSection === 'imprint' && 'rotate-180'
						)}
					/>
				</button>
				<Tooltip>
					<TooltipTrigger asChild>
						<a
							href={buildLocalizedLegalHref(legalDocuments.imprint.path)}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={`${legalCopy.openInNewTabLabel}: ${getLegalSectionLabel(locale, 'imprint')}`}
							className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
						>
							<ExternalLink className="w-3.5 h-3.5" />
						</a>
					</TooltipTrigger>
					<TooltipContent>
						<p>{legalCopy.openInNewTabLabel}</p>
					</TooltipContent>
				</Tooltip>
			</div>

			<div
				className={cn(
					'overflow-hidden transition-all duration-300 ease-out -mt-3',
					'border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20',
					openSection === 'imprint' ? 'flex-1 min-h-0 opacity-100' : 'h-0 opacity-0 border-0'
				)}
			>
				<ScrollArea className="h-full">
					<section lang={locale}>
						<legalDocuments.imprint.Content className="p-4" />
					</section>
				</ScrollArea>
			</div>

			<div className="relative">
				<button
					onClick={() => toggleSection('terms')}
					className={cn(
						'flex items-center justify-between w-full px-4 py-3 pr-14 text-sm shrink-0',
						'border border-white/5 rounded-lg',
						'transition-colors duration-200',
						openSection === 'terms'
							? 'text-white bg-zinc-800/60 rounded-b-none border-b-0'
							: 'text-zinc-300 bg-zinc-900/30 hover:text-white hover:bg-zinc-900/50'
					)}
				>
					<span className="font-medium">{getLegalSectionLabel(locale, 'terms')}</span>
					<ChevronDown
						className={cn(
							'w-4 h-4 transition-transform duration-300 ease-out',
							openSection === 'terms' && 'rotate-180'
						)}
					/>
				</button>
				<Tooltip>
					<TooltipTrigger asChild>
						<a
							href={buildLocalizedLegalHref(legalDocuments.terms.path)}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={`${legalCopy.openInNewTabLabel}: ${getLegalSectionLabel(locale, 'terms')}`}
							className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
						>
							<ExternalLink className="w-3.5 h-3.5" />
						</a>
					</TooltipTrigger>
					<TooltipContent>
						<p>{legalCopy.openInNewTabLabel}</p>
					</TooltipContent>
				</Tooltip>
			</div>

			<div
				className={cn(
					'overflow-hidden transition-all duration-300 ease-out -mt-3',
					'border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20',
					openSection === 'terms' ? 'flex-1 min-h-0 opacity-100' : 'h-0 opacity-0 border-0'
				)}
			>
				<ScrollArea className="h-full">
					<section lang={locale}>
						<legalDocuments.terms.Content className="p-4" />
					</section>
				</ScrollArea>
			</div>

			<div className="relative">
				<button
					onClick={() => toggleSection('privacy')}
					className={cn(
						'flex items-center justify-between w-full px-4 py-3 pr-14 text-sm shrink-0',
						'border border-white/5 rounded-lg',
						'transition-colors duration-200',
						openSection === 'privacy'
							? 'text-white bg-zinc-800/60 rounded-b-none border-b-0'
							: 'text-zinc-300 bg-zinc-900/30 hover:text-white hover:bg-zinc-900/50'
					)}
				>
					<span className="font-medium">{getLegalSectionLabel(locale, 'privacy')}</span>
					<ChevronDown
						className={cn(
							'w-4 h-4 transition-transform duration-300 ease-out',
							openSection === 'privacy' && 'rotate-180'
						)}
					/>
				</button>
				<Tooltip>
					<TooltipTrigger asChild>
						<a
							href={buildLocalizedLegalHref(legalDocuments.privacy.path)}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={`${legalCopy.openInNewTabLabel}: ${getLegalSectionLabel(locale, 'privacy')}`}
							className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
						>
							<ExternalLink className="w-3.5 h-3.5" />
						</a>
					</TooltipTrigger>
					<TooltipContent>
						<p>{legalCopy.openInNewTabLabel}</p>
					</TooltipContent>
				</Tooltip>
			</div>

			<div
				className={cn(
					'overflow-hidden transition-all duration-300 ease-out -mt-3',
					'border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20',
					openSection === 'privacy' ? 'flex-1 min-h-0 opacity-100' : 'h-0 opacity-0 border-0'
				)}
			>
				<ScrollArea className="h-full">
					<section lang={locale}>
						<legalDocuments.privacy.Content className="p-4" />
					</section>
				</ScrollArea>
			</div>
		</div>
	);
}
