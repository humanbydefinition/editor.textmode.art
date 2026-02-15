import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/lib/cn';
import {
	ImprintLegalContent,
	PrivacyLegalContent,
	TermsLegalContent,
} from '@/features/legal/content/legalDocuments';
import { ContactDialog } from './ContactDialog';

export function LegalTab() {
	const [openSection, setOpenSection] = useState<'imprint' | 'terms' | 'privacy' | null>(null);

	const toggleSection = (section: 'imprint' | 'terms' | 'privacy') => {
		setOpenSection(openSection === section ? null : section);
	};

	return (
		<div className="h-full flex flex-col px-6 pt-6 gap-3 overflow-hidden">
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
					<span className="font-medium">Imprint</span>
					<ChevronDown
						className={cn(
							'w-4 h-4 transition-transform duration-300 ease-out',
							openSection === 'imprint' && 'rotate-180'
						)}
					/>
				</button>
				<a
					href="/imprint"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Open Imprint in a new tab"
					title="Open Imprint in full screen"
					className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1 rounded"
				>
					<ExternalLink className="w-3.5 h-3.5" />
				</a>
			</div>

			<div
				className={cn(
					'overflow-hidden transition-all duration-300 ease-out -mt-3',
					'border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20',
					openSection === 'imprint' ? 'flex-1 min-h-0 opacity-100' : 'h-0 opacity-0 border-0'
				)}
			>
				<ScrollArea className="h-full">
					<ImprintLegalContent className="p-4" />
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
					<span className="font-medium">Terms & Acceptable Use</span>
					<ChevronDown
						className={cn(
							'w-4 h-4 transition-transform duration-300 ease-out',
							openSection === 'terms' && 'rotate-180'
						)}
					/>
				</button>
				<a
					href="/tos"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Open Terms and Acceptable Use in a new tab"
					title="Open Terms and Acceptable Use in full screen"
					className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1 rounded"
				>
					<ExternalLink className="w-3.5 h-3.5" />
				</a>
			</div>

			<div
				className={cn(
					'overflow-hidden transition-all duration-300 ease-out -mt-3',
					'border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20',
					openSection === 'terms' ? 'flex-1 min-h-0 opacity-100' : 'h-0 opacity-0 border-0'
				)}
			>
				<ScrollArea className="h-full">
					<TermsLegalContent className="p-4" />
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
					<span className="font-medium">Privacy Policy</span>
					<ChevronDown
						className={cn(
							'w-4 h-4 transition-transform duration-300 ease-out',
							openSection === 'privacy' && 'rotate-180'
						)}
					/>
				</button>
				<a
					href="/privacy"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Open Privacy Policy in a new tab"
					title="Open Privacy Policy in full screen"
					className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1 rounded"
				>
					<ExternalLink className="w-3.5 h-3.5" />
				</a>
			</div>

			<div
				className={cn(
					'overflow-hidden transition-all duration-300 ease-out -mt-3',
					'border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20',
					openSection === 'privacy' ? 'flex-1 min-h-0 opacity-100' : 'h-0 opacity-0 border-0'
				)}
			>
				<ScrollArea className="h-full">
					<PrivacyLegalContent className="p-4" />
				</ScrollArea>
			</div>

			<div className="mt-auto pt-2 shrink-0">
				<ContactDialog />
			</div>
		</div>
	);
}
