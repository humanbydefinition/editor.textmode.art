import type { LegalLocale } from '../model/legalLocale';
import type { LegalDocumentDefinition, LegalDocumentId } from './legalDocument.types';
import {
	ImprintLegalContent,
	PrivacyLegalContent,
	TermsLegalContent,
	LEGAL_DOCUMENTS_EN,
} from './legalDocuments.en';
import { LEGAL_DOCUMENTS_DE } from './legalDocuments.de';

export type { LegalContentProps, LegalDocumentDefinition, LegalDocumentId } from './legalDocument.types';

export const LEGAL_DOCUMENT_ORDER: LegalDocumentId[] = ['imprint', 'terms', 'privacy'];

export const LEGAL_DOCUMENTS_BY_LOCALE: Record<LegalLocale, Record<LegalDocumentId, LegalDocumentDefinition>> = {
	en: LEGAL_DOCUMENTS_EN,
	de: LEGAL_DOCUMENTS_DE,
};

/**
 * Backwards-compatible default until all legal surfaces are migrated to explicit locale selection.
 */
export const LEGAL_DOCUMENTS = LEGAL_DOCUMENTS_EN;

export function getLegalDocuments(locale: LegalLocale): Record<LegalDocumentId, LegalDocumentDefinition> {
	return LEGAL_DOCUMENTS_BY_LOCALE[locale];
}

export function getLegalDocument(locale: LegalLocale, documentId: LegalDocumentId): LegalDocumentDefinition {
	return LEGAL_DOCUMENTS_BY_LOCALE[locale][documentId];
}

export { ImprintLegalContent, TermsLegalContent, PrivacyLegalContent };
