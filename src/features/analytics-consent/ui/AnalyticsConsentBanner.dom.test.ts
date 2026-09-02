import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryStorage } from '../../../../tests/support/memory-storage';
import {
	ANALYTICS_CONSENT_STORAGE_KEY,
	GA_MEASUREMENT_ID,
	openAnalyticsConsentPreferences,
	writeAnalyticsConsent,
} from '../model/analytics-consent';
import { AnalyticsConsentBanner } from './AnalyticsConsentBanner';

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

describe('AnalyticsConsentBanner', () => {
	beforeEach(() => {
		(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
		vi.stubGlobal('localStorage', createMemoryStorage());
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			callback(0);
			return 1;
		});
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
	});

	afterEach(() => {
		for (const { container, root } of mountedRoots.splice(0)) {
			act(() => root.unmount());
			container.remove();
		}
		delete (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('shows on the first visit and grants analytics when accepted', () => {
		const { container } = renderBanner();

		expect(container.querySelector('[role="region"]')).not.toBeNull();
		clickConsentButton(container, 'Allow analytics');

		expect(JSON.parse(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)!)).toMatchObject({
			decision: 'accepted',
			version: 2,
		});
		expect(document.querySelector(`[data-google-analytics-id="${GA_MEASUREMENT_ID}"]`)).not.toBeNull();
		expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`]).toBeUndefined();
	});

	it('rejects analytics and reopens a saved decision from privacy settings', () => {
		vi.useFakeTimers();
		const { container } = renderBanner();

		clickConsentButton(container, 'Reject analytics');
		expect(JSON.parse(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)!)).toMatchObject({
			decision: 'rejected',
			version: 2,
		});
		expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`]).toBe(true);

		act(() => vi.advanceTimersByTime(220));
		expect(container.querySelector('[role="region"]')).toBeNull();

		act(() => openAnalyticsConsentPreferences());
		expect(container.querySelector('[role="region"]')).not.toBeNull();
	});

	it('does not show again after an accepted decision is persisted', () => {
		writeAnalyticsConsent('accepted');
		const { container } = renderBanner();

		expect(container.querySelector('[role="region"]')).toBeNull();
	});
});

function renderBanner(): { container: HTMLDivElement } {
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	mountedRoots.push({ container, root });

	act(() => root.render(createElement(AnalyticsConsentBanner)));

	return { container };
}

function clickConsentButton(container: HTMLDivElement, label: string): void {
	const button = Array.from(container.querySelectorAll('button')).find(
		(candidate) => candidate.textContent === label
	);
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error(`Expected the ${label} button`);
	}

	act(() => button.click());
}
