import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogDescription,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { MessageSquare } from 'lucide-react';
import { ContactForm } from './ContactForm';
import { cn } from '@/shared/lib/cn';
import type { LegalLocale } from '@/features/legal/model/legalLocale';

interface ContactDialogProps {
	buttonClassName?: string;
	locale?: LegalLocale;
}

const CONTACT_DIALOG_COPY: Record<LegalLocale, { cta: string; title: string; description: string }> = {
	en: {
		cta: 'contact us',
		title: 'contact us',
		description: 'have a question or feedback? use one of the direct contact links below.',
	},
	de: {
		cta: 'kontakt',
		title: 'kontakt',
		description: 'hast du eine frage oder feedback? nutze einen der direkten kontaktlinks unten.',
	},
};

export function ContactDialog({ buttonClassName, locale = 'en' }: ContactDialogProps = {}) {
	const copy = CONTACT_DIALOG_COPY[locale];

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					className={cn(
						'w-full bg-zinc-900/40 border border-white/10 text-zinc-400 hover:bg-zinc-800/60 hover:text-white transition-all duration-300 py-5',
						buttonClassName
					)}
				>
					<div className="flex flex-col items-center">
						<div className="flex items-center gap-2">
							<MessageSquare className="w-4 h-4" />
							<span className="font-medium">{copy.cta}</span>
						</div>
					</div>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px] bg-zinc-950/95 backdrop-blur-2xl border-white/10 p-6 flex flex-col outline-none shadow-2xl shadow-black/50">
				<DialogHeader className="mb-2">
					<DialogTitle className="text-xl font-bold tracking-tight text-white">{copy.title}</DialogTitle>
					<DialogDescription className="text-zinc-500">{copy.description}</DialogDescription>
				</DialogHeader>
				<ContactForm locale={locale} />
			</DialogContent>
		</Dialog>
	);
}
