export type AnalyticsConsentDecision = 'accepted' | 'rejected';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'synth_textmode_art_analytics_consent_v1';
export const UMAMI_DISABLED_STORAGE_KEY = 'umami.disabled';
export const UMAMI_SCRIPT_ID = 'synth-textmode-art-umami-analytics';
export const UMAMI_SCRIPT_SRC = 'https://analytics.textmode.art/script.js';
export const UMAMI_WEBSITE_ID = '9b6a2a52-9cb3-4a33-b765-e3f1c54e542e';
export const UMAMI_DOMAIN = 'synth.textmode.art';

const ANALYTICS_CONSENT_OPEN_EVENT = 'synth.textmode.art:analytics-consent-open';

declare global {
	interface Window {
		umami?: unknown;
	}
}

export function openAnalyticsConsentPreferences(): void {
	window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_OPEN_EVENT));
}

export function onAnalyticsConsentPreferencesOpen(listener: () => void): () => void {
	window.addEventListener(ANALYTICS_CONSENT_OPEN_EVENT, listener);

	return () => {
		window.removeEventListener(ANALYTICS_CONSENT_OPEN_EVENT, listener);
	};
}

export function readStoredAnalyticsConsent(): AnalyticsConsentDecision | null {
	const value = readLocalStorage(ANALYTICS_CONSENT_STORAGE_KEY);

	return value === 'accepted' || value === 'rejected' ? value : null;
}

export function writeStoredAnalyticsConsent(decision: AnalyticsConsentDecision): void {
	writeLocalStorage(ANALYTICS_CONSENT_STORAGE_KEY, decision);
}

export function enableUmamiAnalytics(): void {
	removeLocalStorageItem(UMAMI_DISABLED_STORAGE_KEY);
	injectUmamiScript();
}

export function disableUmamiAnalytics(): void {
	writeLocalStorage(UMAMI_DISABLED_STORAGE_KEY, '1');
	removeUmamiScript();

	if ('umami' in window) {
		window.umami = undefined;
	}
}

function injectUmamiScript(): void {
	if (document.getElementById(UMAMI_SCRIPT_ID)) {
		return;
	}

	const script = document.createElement('script');
	script.id = UMAMI_SCRIPT_ID;
	script.defer = true;
	script.src = UMAMI_SCRIPT_SRC;
	script.dataset.websiteId = UMAMI_WEBSITE_ID;
	script.dataset.domains = UMAMI_DOMAIN;
	script.dataset.excludeSearch = 'true';
	script.dataset.excludeHash = 'true';
	script.dataset.doNotTrack = 'true';

	document.head.appendChild(script);
}

function removeUmamiScript(): void {
	document.getElementById(UMAMI_SCRIPT_ID)?.remove();
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

function removeLocalStorageItem(key: string): void {
	try {
		window.localStorage.removeItem(key);
	} catch {
		// Ignore storage failures; runtime behavior still follows current consent.
	}
}
