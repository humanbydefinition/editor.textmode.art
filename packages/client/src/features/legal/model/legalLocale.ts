export const LEGAL_LOCALES = ['en', 'de'] as const;

export type LegalLocale = (typeof LEGAL_LOCALES)[number];

export const LEGAL_LANGUAGE_QUERY_PARAM = 'lang';
export const LEGAL_ROUTE_PATHS = ['/imprint', '/tos', '/privacy', '/contact'] as const;

export const DEFAULT_LEGAL_LOCALE: LegalLocale = 'de';

export function isLegalLocale(value: string | null | undefined): value is LegalLocale {
	return value === 'en' || value === 'de';
}

export function normalizeLegalLocale(value: string | null | undefined): LegalLocale | null {
	if (!value) return null;

	const normalized = value.toLowerCase();
	if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
	if (normalized === 'de' || normalized.startsWith('de-')) return 'de';

	return null;
}

export function detectBrowserLegalLocale(languages: readonly string[] | undefined): LegalLocale {
	if (!languages || languages.length === 0) return DEFAULT_LEGAL_LOCALE;

	for (const language of languages) {
		const normalized = normalizeLegalLocale(language);
		if (normalized) return normalized;
	}

	return DEFAULT_LEGAL_LOCALE;
}

export function stripLocalePrefix(pathname: string): { locale: LegalLocale | null; path: string } {
	const normalizedPath = pathname.toLowerCase();

	if (normalizedPath === '/en' || normalizedPath.startsWith('/en/')) {
		const stripped = normalizedPath === '/en' ? '/' : normalizedPath.slice(3);
		return { locale: 'en', path: stripped };
	}

	if (normalizedPath === '/de' || normalizedPath.startsWith('/de/')) {
		const stripped = normalizedPath === '/de' ? '/' : normalizedPath.slice(3);
		return { locale: 'de', path: stripped };
	}

	return { locale: null, path: normalizedPath };
}

export function isLegalRoutePath(pathname: string): boolean {
	const normalizedPath = pathname.toLowerCase();
	return LEGAL_ROUTE_PATHS.includes(normalizedPath as (typeof LEGAL_ROUTE_PATHS)[number]);
}

export function buildLocalizedLegalPath(path: string, locale: LegalLocale): string {
	const normalizedPath = path.toLowerCase();
	if (!isLegalRoutePath(normalizedPath)) return path;
	return `/${locale}${normalizedPath}`;
}
