import { Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { APP_META } from '@/shared/config/appMeta';
import type { LegalLocale } from '@/features/legal/model/legalLocale';

const CONTACT_COPY: Record<
	LegalLocale,
	{
		title: string;
		description: string;
		email: string;
		discord: string;
	}
> = {
	en: {
		title: 'Get in touch',
		description: 'For questions, feedback, legal notices, rights claims, or abuse reports, contact us directly.',
		email: 'Send email',
		discord: 'Open Discord',
	},
	de: {
		title: 'Kontakt aufnehmen',
		description:
			'Bei Fragen, Feedback, rechtlichen Hinweisen, Rechteanspruechen oder Missbrauchsmeldungen kontaktiere uns direkt.',
		email: 'E-Mail senden',
		discord: 'Discord oeffnen',
	},
};

interface ContactFormProps {
	locale?: LegalLocale;
}

export function ContactForm({ locale = 'en' }: ContactFormProps) {
	const copy = CONTACT_COPY[locale];

	return (
		<div className="space-y-4 rounded-lg border border-white/5 bg-zinc-900/30 p-4">
			<div className="space-y-2">
				<h3 className="text-base font-medium text-zinc-100">{copy.title}</h3>
				<p className="text-sm leading-relaxed text-zinc-400">{copy.description}</p>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<Button
					asChild
					className="justify-center border border-emerald-500/20 bg-emerald-500/10 py-5 text-emerald-300 hover:bg-emerald-500/20"
				>
					<a href={`mailto:${APP_META.contactEmail}`}>
						<Mail className="mr-2 h-4 w-4" />
						{copy.email}
					</a>
				</Button>
				<Button
					asChild
					className="justify-center border border-white/10 bg-zinc-900/60 py-5 text-zinc-300 hover:bg-zinc-800 hover:text-white"
				>
					<a href={APP_META.urls.discord} target="_blank" rel="noopener noreferrer">
						<MessageCircle className="mr-2 h-4 w-4" />
						{copy.discord}
					</a>
				</Button>
			</div>

			<p className="text-xs text-zinc-500">
				<a href={`mailto:${APP_META.contactEmail}`} className="text-zinc-300 hover:text-white">
					{APP_META.contactEmail}
				</a>
			</p>
		</div>
	);
}
