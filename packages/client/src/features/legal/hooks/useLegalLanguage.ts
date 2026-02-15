import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	DEFAULT_LEGAL_LOCALE,
	LEGAL_LANGUAGE_QUERY_PARAM,
	buildLocalizedLegalPath,
	detectBrowserLegalLocale,
	isLegalRoutePath,
	normalizeLegalLocale,
	stripLocalePrefix,
	type LegalLocale,
} from '@/features/legal/model/legalLocale';

const LEGAL_LANGUAGE_STORAGE_KEY = 'legal_language';

interface SetLegalLanguageOptions {
	syncUrl?: boolean;
}

interface UseLegalLanguageOptions {
	syncUrlOnChange?: boolean;
	syncDocumentLang?: boolean;
}

function readStoredLegalLocale(): LegalLocale | null {
	try {
		const storedLocale = localStorage.getItem(LEGAL_LANGUAGE_STORAGE_KEY);
		return normalizeLegalLocale(storedLocale);
	} catch {
		return null;
	}
}

function writeStoredLegalLocale(locale: LegalLocale): void {
	try {
		localStorage.setItem(LEGAL_LANGUAGE_STORAGE_KEY, locale);
	} catch {
		// Ignore storage failures.
	}
}

function getLocaleFromSearch(search: string): LegalLocale | null {
	const params = new URLSearchParams(search);
	return normalizeLegalLocale(params.get(LEGAL_LANGUAGE_QUERY_PARAM));
}

function updateCurrentUrlLocale(locale: LegalLocale): void {
	const url = new URL(window.location.href);
	const { path } = stripLocalePrefix(url.pathname);
	if (isLegalRoutePath(path)) {
		url.pathname = buildLocalizedLegalPath(path, locale);
		url.searchParams.delete(LEGAL_LANGUAGE_QUERY_PARAM);
	} else {
		url.searchParams.set(LEGAL_LANGUAGE_QUERY_PARAM, locale);
	}
	window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function resolveInitialLocale(): LegalLocale {
	const { locale: localeFromPath } = stripLocalePrefix(window.location.pathname);
	if (localeFromPath) return localeFromPath;

	const localeFromSearch = getLocaleFromSearch(window.location.search);
	if (localeFromSearch) return localeFromSearch;

	const storedLocale = readStoredLegalLocale();
	if (storedLocale) return storedLocale;

	return detectBrowserLegalLocale(
		navigator.languages && navigator.languages.length > 0 ? navigator.languages : [navigator.language]
	);
}

function buildLocalizedHref(path: string, locale: LegalLocale): string {
	const url = new URL(path, window.location.origin);
	const { path: barePath } = stripLocalePrefix(url.pathname);

	if (isLegalRoutePath(barePath)) {
		url.pathname = buildLocalizedLegalPath(barePath, locale);
		url.searchParams.delete(LEGAL_LANGUAGE_QUERY_PARAM);
	} else {
		url.searchParams.set(LEGAL_LANGUAGE_QUERY_PARAM, locale);
	}

	return `${url.pathname}${url.search}${url.hash}`;
}

export function useLegalLanguage(options: UseLegalLanguageOptions = {}) {
	const { syncUrlOnChange = false, syncDocumentLang = false } = options;
	const [locale, setLocaleState] = useState<LegalLocale>(() => {
		if (typeof window === 'undefined') return DEFAULT_LEGAL_LOCALE;
		return resolveInitialLocale();
	});

	useEffect(() => {
		writeStoredLegalLocale(locale);
		if (syncUrlOnChange && typeof window !== 'undefined') {
			updateCurrentUrlLocale(locale);
		}
	}, [locale, syncUrlOnChange]);

	useEffect(() => {
		if (!syncDocumentLang || typeof document === 'undefined') return;
		document.documentElement.lang = locale;
	}, [locale, syncDocumentLang]);

	const setLocale = useCallback((nextLocale: LegalLocale, setOptions?: SetLegalLanguageOptions) => {
		setLocaleState(nextLocale);
		if (setOptions?.syncUrl && typeof window !== 'undefined') {
			updateCurrentUrlLocale(nextLocale);
		}
	}, []);

	const buildLocalizedLegalHref = useCallback(
		(path: string): string => {
			if (typeof window === 'undefined') return path;
			return buildLocalizedHref(path, locale);
		},
		[locale]
	);

	return useMemo(
		() => ({
			locale,
			setLocale,
			buildLocalizedLegalHref,
		}),
		[buildLocalizedLegalHref, locale, setLocale]
	);
}
