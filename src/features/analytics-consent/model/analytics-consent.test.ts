import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	ANALYTICS_CONSENT_STORAGE_KEY,
	GA_MEASUREMENT_ID,
	disableGoogleAnalytics,
	enableGoogleAnalytics,
	initializeGoogleAnalytics,
	onAnalyticsConsentPreferencesOpen,
	openAnalyticsConsentPreferences,
	readStoredAnalyticsConsent,
	writeStoredAnalyticsConsent,
} from './analytics-consent';

function installWindow(values = new Map<string, string>()) {
	const localStorage = {
		getItem: vi.fn((key: string) => values.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => values.set(key, value)),
	};
	const fakeWindow = {
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
		localStorage,
	} as Record<string, unknown>;
	vi.stubGlobal('window', fakeWindow);

	return { fakeWindow, localStorage };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('analytics consent storage', () => {
	it('parses only valid choices and persists the selected decision', () => {
		const values = new Map<string, string>();
		const { localStorage } = installWindow(values);

		expect(readStoredAnalyticsConsent()).toBeNull();
		values.set(ANALYTICS_CONSENT_STORAGE_KEY, 'invalid');
		expect(readStoredAnalyticsConsent()).toBeNull();

		writeStoredAnalyticsConsent('accepted');
		expect(localStorage.setItem).toHaveBeenCalledWith(ANALYTICS_CONSENT_STORAGE_KEY, 'accepted');
		expect(readStoredAnalyticsConsent()).toBe('accepted');
	});

	it('falls back safely when local storage is unavailable', () => {
		vi.stubGlobal('window', {
			get localStorage(): Storage {
				throw new Error('storage disabled');
			},
		});

		expect(readStoredAnalyticsConsent()).toBeNull();
		expect(() => writeStoredAnalyticsConsent('rejected')).not.toThrow();
	});
});

describe('analytics preferences event', () => {
	it('opens preferences and cleans up its subscription', () => {
		const { fakeWindow } = installWindow();
		const listener = vi.fn();
		const CustomEventMock = vi.fn(function (this: { type: string }, type: string) {
			this.type = type;
		});
		vi.stubGlobal('CustomEvent', CustomEventMock);

		const unsubscribe = onAnalyticsConsentPreferencesOpen(listener);
		expect(fakeWindow.addEventListener).toHaveBeenCalledWith(
			'editor.textmode.art:analytics-consent-open',
			listener
		);

		openAnalyticsConsentPreferences();
		expect(fakeWindow.dispatchEvent).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'editor.textmode.art:analytics-consent-open' })
		);

		unsubscribe();
		expect(fakeWindow.removeEventListener).toHaveBeenCalledWith(
			'editor.textmode.art:analytics-consent-open',
			listener
		);
	});
});

describe('Google Analytics consent mode', () => {
	it('initializes once with analytics storage denied and injects the Google tag', () => {
		const { fakeWindow } = installWindow();
		const appended: Array<Record<string, unknown>> = [];
		const document = {
			querySelector: vi.fn(() => null),
			createElement: vi.fn(() => ({ dataset: {} })),
			head: { append: vi.fn((tag: Record<string, unknown>) => appended.push(tag)) },
		};
		vi.stubGlobal('document', document);

		initializeGoogleAnalytics();
		initializeGoogleAnalytics();

		expect(fakeWindow).toMatchObject({
			__editorTextmodeGoogleAnalyticsInitialized: true,
			dataLayer: [
				['consent', 'default', { analytics_storage: 'denied' }],
				['js', expect.any(Date)],
				['config', GA_MEASUREMENT_ID],
			],
		});
		expect(document.head.append).toHaveBeenCalledTimes(1);
		expect(appended[0]).toMatchObject({
			async: true,
			src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
			dataset: { googleAnalyticsId: GA_MEASUREMENT_ID },
		});
	});

	it('grants and revokes storage while maintaining the opt-out marker', () => {
		const { fakeWindow } = installWindow();
		const gtag = vi.fn();
		fakeWindow.gtag = gtag;
		fakeWindow[`ga-disable-${GA_MEASUREMENT_ID}`] = true;

		enableGoogleAnalytics();
		expect(fakeWindow[`ga-disable-${GA_MEASUREMENT_ID}`]).toBeUndefined();
		expect(gtag).toHaveBeenLastCalledWith('consent', 'update', {
			analytics_storage: 'granted',
		});

		disableGoogleAnalytics();
		expect(fakeWindow[`ga-disable-${GA_MEASUREMENT_ID}`]).toBe(true);
		expect(gtag).toHaveBeenLastCalledWith('consent', 'update', {
			analytics_storage: 'denied',
		});
	});
});
