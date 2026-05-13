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
	backToAppLabel: string;
	backToAppAriaLabel: string;
	contactLabel: string;
	openInNewTabLabel: string;
	legalPagesNavAriaLabel: string;
	footer: LegalFooterCopy;
	sectionLabels: LegalSectionLabels;
}

export const LEGAL_UI_COPY_BY_LOCALE: Record<LegalLocale, LegalUiCopy> = {
	en: {
		backToAppLabel: 'Back to App',
		backToAppAriaLabel: 'Return to synth.textmode.art app',
		contactLabel: 'Contact',
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
		backToAppLabel: 'Zur App',
		backToAppAriaLabel: 'Zurück zur synth.textmode.art App',
		contactLabel: 'Kontakt',
		openInNewTabLabel: 'in neuem tab öffnen',
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
			privacy: 'Datenschutzerklärung',
		},
	},
};

export function getLegalUiCopy(locale: LegalLocale): LegalUiCopy {
	return LEGAL_UI_COPY_BY_LOCALE[locale];
}

export function getLegalSectionLabel(locale: LegalLocale, documentId: LegalDocumentId): string {
	return LEGAL_UI_COPY_BY_LOCALE[locale].sectionLabels[documentId];
}
