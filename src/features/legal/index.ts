export { LegalDocumentPage } from './ui/LegalDocumentPage';
export { LegalLanguageToggle } from './ui/LegalLanguageToggle';
export { useLegalLanguage } from './hooks/useLegalLanguage';
export { useLegalSeo } from './hooks/useLegalSeo';
export {
	LEGAL_DOCUMENTS,
	LEGAL_DOCUMENT_ORDER,
	LEGAL_DOCUMENTS_BY_LOCALE,
	getLegalDocument,
	getLegalDocuments,
	type LegalContentProps,
	type LegalDocumentDefinition,
	type LegalDocumentId,
} from './content/legalDocuments';
export { LEGAL_UI_COPY_BY_LOCALE, getLegalSectionLabel, getLegalUiCopy, type LegalUiCopy } from './content/legalUiCopy';
export {
	DEFAULT_LEGAL_LOCALE,
	LEGAL_LANGUAGE_QUERY_PARAM,
	LEGAL_LOCALES,
	detectBrowserLegalLocale,
	isLegalLocale,
	normalizeLegalLocale,
	type LegalLocale,
} from './model/legalLocale';
