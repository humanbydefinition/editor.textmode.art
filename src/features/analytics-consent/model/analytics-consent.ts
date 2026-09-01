export type AnalyticsConsentDecision = 'accepted' | 'rejected';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'editor_textmode_art_analytics_consent_v1';
export const GA_MEASUREMENT_ID = 'G-T1XY1BP9TT';

const ANALYTICS_CONSENT_OPEN_EVENT = 'editor.textmode.art:analytics-consent-open';

type Gtag = (...args: unknown[]) => void;

type AnalyticsWindow = Window & {
	[key: string]: unknown;
	dataLayer?: unknown[][];
	gtag?: Gtag;
	__editorTextmodeGoogleAnalyticsInitialized?: boolean;
};

export function initializeGoogleAnalytics(): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;

	const analyticsWindow = window as unknown as AnalyticsWindow;
	if (analyticsWindow.__editorTextmodeGoogleAnalyticsInitialized) return;

	analyticsWindow.__editorTextmodeGoogleAnalyticsInitialized = true;
	analyticsWindow.dataLayer ??= [];
	analyticsWindow.gtag ??= (...args: unknown[]) => {
		analyticsWindow.dataLayer?.push(args);
	};

	analyticsWindow.gtag('consent', 'default', { analytics_storage: 'denied' });
	analyticsWindow.gtag('js', new Date());
	analyticsWindow.gtag('config', GA_MEASUREMENT_ID);

	const existingTag = document.querySelector<HTMLScriptElement>(
		`script[data-google-analytics-id="${GA_MEASUREMENT_ID}"]`
	);
	if (existingTag) return;

	const tag = document.createElement('script');
	tag.async = true;
	tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
	tag.dataset.googleAnalyticsId = GA_MEASUREMENT_ID;
	document.head.append(tag);
}

export function openAnalyticsConsentPreferences(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_OPEN_EVENT));
}

export function onAnalyticsConsentPreferencesOpen(listener: () => void): () => void {
	if (typeof window === 'undefined') return () => {};

	window.addEventListener(ANALYTICS_CONSENT_OPEN_EVENT, listener);
	return () => window.removeEventListener(ANALYTICS_CONSENT_OPEN_EVENT, listener);
}

export function readStoredAnalyticsConsent(): AnalyticsConsentDecision | null {
	const value = readLocalStorage(ANALYTICS_CONSENT_STORAGE_KEY);
	return value === 'accepted' || value === 'rejected' ? value : null;
}

export function writeStoredAnalyticsConsent(decision: AnalyticsConsentDecision): void {
	writeLocalStorage(ANALYTICS_CONSENT_STORAGE_KEY, decision);
}

export function updateGoogleAnalyticsConsent(status: 'granted' | 'denied'): void {
	if (typeof window === 'undefined') return;
	const gtag = (window as unknown as AnalyticsWindow).gtag;
	gtag?.('consent', 'update', { analytics_storage: status });
}

export function enableGoogleAnalytics(): void {
	if (typeof window !== 'undefined') {
		delete (window as unknown as AnalyticsWindow)[`ga-disable-${GA_MEASUREMENT_ID}`];
	}
	updateGoogleAnalyticsConsent('granted');
}

export function disableGoogleAnalytics(): void {
	if (typeof window !== 'undefined') {
		(window as unknown as AnalyticsWindow)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
	}
	updateGoogleAnalyticsConsent('denied');
}

function readLocalStorage(key: string): string | null {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeLocalStorage(key: string, value: string): void {
	try {
		window.localStorage.setItem(key, value);
	} catch {
		// Consent still applies for the current in-memory session.
	}
}
