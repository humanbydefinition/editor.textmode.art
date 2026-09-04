import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	ANALYTICS_CONSENT_STORAGE_KEY,
	GA_MEASUREMENT_ID,
	loadGoogleAnalyticsAfterConsent,
	onAnalyticsConsentPreferencesOpen,
	openAnalyticsConsentPreferences,
	readAnalyticsConsent,
	revokeGoogleAnalytics,
	writeAnalyticsConsent,
} from './analytics-consent';

describe('analytics consent', () => {
	let values: Map<string, string>;
	let analyticsWindow: Record<string, unknown>;
	let appended: Array<Record<string, unknown>>;

	beforeEach(() => {
		values = new Map();
		appended = [];
		analyticsWindow = {
			localStorage: {
				getItem: vi.fn((key: string) => values.get(key) ?? null),
				setItem: vi.fn((key: string, value: string) => values.set(key, value)),
				removeItem: vi.fn((key: string) => values.delete(key)),
			},
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		};
		vi.stubGlobal('window', analyticsWindow);
		vi.stubGlobal(
			'CustomEvent',
			class {
				type: string;

				constructor(type: string) {
					this.type = type;
				}
			}
		);
		vi.stubGlobal('document', {
			cookie: '',
			querySelector: vi.fn(() => null),
			createElement: vi.fn(() => ({ dataset: {} })),
			head: { append: vi.fn((tag: Record<string, unknown>) => appended.push(tag)) },
		});
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('stores and reads a versioned consent record', () => {
		writeAnalyticsConsent('accepted');

		expect(JSON.parse(values.get(ANALYTICS_CONSENT_STORAGE_KEY)!)).toMatchObject({
			decision: 'accepted',
			version: 2,
			decidedAt: expect.any(String),
		});
		expect(readAnalyticsConsent()).toBe('accepted');
	});

	it('does not initialize Google Analytics without an accepted v2 decision', () => {
		loadGoogleAnalyticsAfterConsent();

		expect(appended).toEqual([]);
		expect(analyticsWindow.dataLayer).toBeUndefined();
	});

	it('keeps analytics disabled when consent cannot be persisted', () => {
		analyticsWindow.localStorage = {
			getItem: vi.fn(() => {
				throw new Error('storage unavailable');
			}),
			setItem: vi.fn(() => {
				throw new Error('storage unavailable');
			}),
		};

		writeAnalyticsConsent('accepted');
		loadGoogleAnalyticsAfterConsent();

		expect(appended).toEqual([]);
		expect(analyticsWindow.dataLayer).toBeUndefined();
	});

	it('loads Google Analytics exactly once after consent', () => {
		writeAnalyticsConsent('accepted');

		loadGoogleAnalyticsAfterConsent();
		loadGoogleAnalyticsAfterConsent();

		expect(appended).toHaveLength(1);
		expect(appended[0]).toMatchObject({
			async: true,
			src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
			dataset: { googleAnalyticsId: GA_MEASUREMENT_ID },
		});
		const dataLayer = analyticsWindow.dataLayer as IArguments[];
		expect(dataLayer.every((entry) => !Array.isArray(entry))).toBe(true);
		expect(dataLayer.map((entry) => Array.from(entry))).toEqual([
			['js', expect.any(Date)],
			['config', GA_MEASUREMENT_ID],
		]);
	});

	it('revokes future analytics collection without sending a denied consent update', () => {
		revokeGoogleAnalytics();

		expect(analyticsWindow[`ga-disable-${GA_MEASUREMENT_ID}`]).toBe(true);
		expect(analyticsWindow.dataLayer).toBeUndefined();
	});

	it('opens preferences and cleans up its subscription', () => {
		const listener = vi.fn();
		const unsubscribe = onAnalyticsConsentPreferencesOpen(listener);

		openAnalyticsConsentPreferences();
		expect(analyticsWindow.dispatchEvent).toHaveBeenCalledTimes(1);

		unsubscribe();
		expect(analyticsWindow.removeEventListener).toHaveBeenCalledTimes(1);
	});
});
