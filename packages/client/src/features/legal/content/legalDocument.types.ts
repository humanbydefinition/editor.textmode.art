import type { ComponentType } from 'react';

export type LegalDocumentId = 'imprint' | 'terms' | 'privacy';

export interface LegalContentProps {
	className?: string;
}

export interface LegalDocumentDefinition {
	id: LegalDocumentId;
	title: string;
	navLabel: string;
	path: '/imprint' | '/tos' | '/privacy';
	description: string;
	Content: ComponentType<LegalContentProps>;
}
