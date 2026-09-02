export type AnalyticsConsentDecision = 'accepted' | 'rejected';

export interface AnalyticsConsentRecord {
	decision: AnalyticsConsentDecision;
	version: 2;
	decidedAt: string;
}

export const ANALYTICS_CONSENT_STORAGE_KEY = 'editor.textmode.art:analytics-consent:v2';
export const GA_MEASUREMENT_ID = 'G-T1XY1BP9TT';

const LEGACY_ANALYTICS_CONSENT_STORAGE_KEY = 'editor_textmode_art_analytics_consent_v1';
const ANALYTICS_CONSENT_OPEN_EVENT = 'editor.textmode.art:analytics-consent-open';

type Gtag = (...args: unknown[]) => void;

type AnalyticsWindow = Window & {
	[key: string]: unknown;
	dataLayer?: unknown[][];
	gtag?: Gtag;
	__editorTextmodeGoogleAnalyticsInitialized?: boolean;
	__editorTextmodeAnalyticsConsent?: AnalyticsConsentDecision;
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
	removeLegacyAnalyticsConsent();
	const raw = readLocalStorage(ANALYTICS_CONSENT_STORAGE_KEY);
	const analyticsWindow = window as unknown as AnalyticsWindow;
	if (raw === undefined) {
		return analyticsWindow.__editorTextmodeAnalyticsConsent ?? null;
	}
	if (!raw) return null;

	try {
		const record = JSON.parse(raw) as Partial<AnalyticsConsentRecord>;
		const decision =
			record.version === 2 &&
			(record.decision === 'accepted' || record.decision === 'rejected') &&
			typeof record.decidedAt === 'string'
				? record.decision
				: null;
		if (decision) {
			analyticsWindow.__editorTextmodeAnalyticsConsent = decision;
		} else {
			delete analyticsWindow.__editorTextmodeAnalyticsConsent;
		}
		return decision;
	} catch {
		return null;
	}
}

export function writeAnalyticsConsent(decision: AnalyticsConsentDecision): void {
	if (typeof window !== 'undefined') {
		(window as unknown as AnalyticsWindow).__editorTextmodeAnalyticsConsent = decision;
	}
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

function removeLegacyAnalyticsConsent(): void {
	removeLocalStorage(LEGACY_ANALYTICS_CONSENT_STORAGE_KEY);
}

function clearGoogleAnalyticsCookies(): void {
	if (typeof document === 'undefined') return;

	const cookieNames = ['_ga', `_ga_${GA_MEASUREMENT_ID.replace(/^G-/, '')}`];
	for (const name of cookieNames) {
		document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
	}
}

function readLocalStorage(key: string): string | null | undefined {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return undefined;
	}
}

function writeLocalStorage(key: string, value: string): void {
	try {
		window.localStorage.setItem(key, value);
	} catch {
		// The in-memory banner state still protects the current session.
	}
}

function removeLocalStorage(key: string): void {
	try {
		window.localStorage.removeItem(key);
	} catch {
		// Storage may be unavailable; ignoring v1 data remains safe.
	}
}
