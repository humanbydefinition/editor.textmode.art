export type AnalyticsConsentDecision = 'accepted' | 'rejected';

export interface AnalyticsConsentRecord {
	decision: AnalyticsConsentDecision;
	version: 2;
	decidedAt: string;
}

export const ANALYTICS_CONSENT_STORAGE_KEY = 'editor.textmode.art:analytics-consent:v2';
export const GA_MEASUREMENT_ID = 'G-T1XY1BP9TT';

const ANALYTICS_CONSENT_OPEN_EVENT = 'editor.textmode.art:analytics-consent-open';

type Gtag = (...args: unknown[]) => void;

type AnalyticsWindow = Window & {
	[key: string]: unknown;
	dataLayer?: unknown[][];
	gtag?: Gtag;
	__editorTextmodeGoogleAnalyticsInitialized?: boolean;
};

export function openAnalyticsConsentPreferences(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_OPEN_EVENT));
}

export function onAnalyticsConsentPreferencesOpen(listener: () => void): () => void {
	if (typeof window === 'undefined') return () => {};

	window.addEventListener(ANALYTICS_CONSENT_OPEN_EVENT, listener);
	return () => window.removeEventListener(ANALYTICS_CONSENT_OPEN_EVENT, listener);
}

export function readAnalyticsConsent(): AnalyticsConsentDecision | null {
	if (typeof window === 'undefined') return null;
	const raw = readLocalStorage(ANALYTICS_CONSENT_STORAGE_KEY);
	if (!raw) return null;

	try {
		const record = JSON.parse(raw) as Partial<AnalyticsConsentRecord>;
		const decision =
			record.version === 2 &&
			(record.decision === 'accepted' || record.decision === 'rejected') &&
			typeof record.decidedAt === 'string'
				? record.decision
				: null;
		return decision;
	} catch {
		return null;
	}
}

export function writeAnalyticsConsent(decision: AnalyticsConsentDecision): void {
	const record: AnalyticsConsentRecord = {
		decision,
		version: 2,
		decidedAt: new Date().toISOString(),
	};
	writeLocalStorage(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify(record));
}

export function loadGoogleAnalyticsAfterConsent(): void {
	if (typeof window === 'undefined' || typeof document === 'undefined' || readAnalyticsConsent() !== 'accepted') {
		return;
	}

	const analyticsWindow = window as unknown as AnalyticsWindow;
	if (analyticsWindow.__editorTextmodeGoogleAnalyticsInitialized) return;

	analyticsWindow.__editorTextmodeGoogleAnalyticsInitialized = true;
	delete analyticsWindow[`ga-disable-${GA_MEASUREMENT_ID}`];
	analyticsWindow.dataLayer ??= [];
	analyticsWindow.gtag ??= (...args: unknown[]) => {
		analyticsWindow.dataLayer?.push(args);
	};
	analyticsWindow.gtag('consent', 'default', {
		analytics_storage: 'granted',
		ad_storage: 'denied',
		ad_user_data: 'denied',
		ad_personalization: 'denied',
	});
	analyticsWindow.gtag('js', new Date());
	analyticsWindow.gtag('config', GA_MEASUREMENT_ID);

	if (document.querySelector(`script[data-google-analytics-id="${GA_MEASUREMENT_ID}"]`)) {
		return;
	}

	const tag = document.createElement('script');
	tag.async = true;
	tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
	tag.dataset.googleAnalyticsId = GA_MEASUREMENT_ID;
	document.head.append(tag);
}

export function revokeGoogleAnalytics(): void {
	if (typeof window === 'undefined') return;

	const analyticsWindow = window as unknown as AnalyticsWindow;
	analyticsWindow[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
	clearGoogleAnalyticsCookies();
}

function clearGoogleAnalyticsCookies(): void {
	if (typeof document === 'undefined') return;

	const cookieNames = ['_ga', `_ga_${GA_MEASUREMENT_ID.replace(/^G-/, '')}`];
	for (const name of cookieNames) {
		document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
	}
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
		// Analytics remains disabled when consent cannot be persisted.
	}
}
