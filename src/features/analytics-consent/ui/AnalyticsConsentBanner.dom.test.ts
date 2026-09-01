import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryStorage } from '../../../../tests/support/memory-storage';
import {
	ANALYTICS_CONSENT_STORAGE_KEY,
	GA_MEASUREMENT_ID,
	openAnalyticsConsentPreferences,
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
		const gtag = vi.fn();
		(window as unknown as Record<string, unknown>).gtag = gtag;
		const { container } = renderBanner();

		expect(container.querySelector('[role="region"]')).not.toBeNull();
		clickConsentButton(container, 'Allow analytics');

		expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('accepted');
		expect(gtag).toHaveBeenLastCalledWith('consent', 'update', { analytics_storage: 'granted' });
		expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`]).toBeUndefined();
	});

	it('rejects analytics and reopens a saved decision from privacy settings', () => {
		vi.useFakeTimers();
		const { container } = renderBanner();

		clickConsentButton(container, 'Reject analytics');
		expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('rejected');
		expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`]).toBe(true);

		act(() => vi.advanceTimersByTime(220));
		expect(container.querySelector('[role="region"]')).toBeNull();

		act(() => openAnalyticsConsentPreferences());
		expect(container.querySelector('[role="region"]')).not.toBeNull();
	});

	it('does not show again after an accepted decision is persisted', () => {
		localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'accepted');
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
