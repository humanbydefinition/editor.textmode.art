import type { LegalLocale } from '../model/legalLocale';
import type { LegalDocumentId } from './legalDocument.types';

interface LegalFooterCopy {
	imprint: string;
	terms: string;
	privacy: string;
	contact: string;
}

interface LegalSectionLabels {
	imprint: string;
	terms: string;
	privacy: string;
}

export interface LegalUiCopy {
	contactBadgeLabel: string;
	backToAppLabel: string;
	backToAppAriaLabel: string;
	contactLabel: string;
	contactPageTitle: string;
	contactPageDescription: string;
	openInNewTabLabel: string;
	legalPagesNavAriaLabel: string;
	footer: LegalFooterCopy;
	sectionLabels: LegalSectionLabels;
}

export const LEGAL_UI_COPY_BY_LOCALE: Record<LegalLocale, LegalUiCopy> = {
	en: {
		contactBadgeLabel: 'Contact',
		backToAppLabel: 'Back to App',
		backToAppAriaLabel: 'Return to synth.textmode.art app',
		contactLabel: 'Contact',
		contactPageTitle: 'contact us',
		contactPageDescription: 'have a question, legal request, or feedback? send a message and we\'ll respond as soon as possible.',
		openInNewTabLabel: 'open in new tab',
		legalPagesNavAriaLabel: 'Legal pages navigation',
		footer: {
			imprint: 'Imprint',
			terms: 'Terms',
			privacy: 'Privacy',
			contact: 'Contact',
		},
		sectionLabels: {
			imprint: 'Imprint',
			terms: 'Terms & Acceptable Use',
			privacy: 'Privacy Policy',
		},
	},
	de: {
		contactBadgeLabel: 'Kontakt',
		backToAppLabel: 'Zur App',
		backToAppAriaLabel: 'Zurueck zur synth.textmode.art App',
		contactLabel: 'Kontakt',
		contactPageTitle: 'kontakt',
		contactPageDescription: 'hast du eine frage, eine rechtliche anfrage oder feedback? sende uns eine nachricht und wir antworten schnellstmoeglich.',
		openInNewTabLabel: 'in neuem tab oeffnen',
		legalPagesNavAriaLabel: 'Navigation der Rechtstexte',
		footer: {
			imprint: 'Impressum',
			terms: 'Nutzung',
			privacy: 'Datenschutz',
			contact: 'Kontakt',
		},
		sectionLabels: {
			imprint: 'Impressum',
			terms: 'Nutzungsbedingungen',
			privacy: 'Datenschutzerklaerung',
		},
	},
};

export function getLegalUiCopy(locale: LegalLocale): LegalUiCopy {
	return LEGAL_UI_COPY_BY_LOCALE[locale];
}

export function getLegalSectionLabel(locale: LegalLocale, documentId: LegalDocumentId): string {
	return LEGAL_UI_COPY_BY_LOCALE[locale].sectionLabels[documentId];
}
