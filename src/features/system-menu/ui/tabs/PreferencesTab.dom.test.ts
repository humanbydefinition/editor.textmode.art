import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, createElement, Fragment, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DEFAULT_SETTINGS } from '@/types';
import { PreferencesTab } from './PreferencesTab';

vi.mock('@/shared/ui/scroll-area', () => ({
	ScrollArea: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));

vi.mock('@/shared/ui/tooltip', () => ({
	Tooltip: ({ children }: { children: ReactNode }) => createElement(Fragment, null, children),
	TooltipTrigger: ({ children }: { children: ReactNode }) => createElement(Fragment, null, children),
	TooltipContent: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

describe('PreferencesTab local sketch restoration', () => {
	beforeAll(() => {
		(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				unobserve(): void {}
				disconnect(): void {}
			}
		);
	});

	afterAll(() => {
		delete (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		for (const { container, root } of mountedRoots.splice(0)) {
			act(() => root.unmount());
			container.remove();
		}
	});

	it('disables restoration outside an active gallery sketch', () => {
		const { button } = renderPreferences({
			isGallerySketchActive: false,
			hasLocalSketch: true,
		});

		expect(button.disabled).toBe(true);
		expect(button.parentElement?.getAttribute('aria-label')).toBe(
			'available while viewing an unmodified gallery sketch'
		);
	});

	it('explains when an active gallery sketch has no saved local code', () => {
		const { button } = renderPreferences({
			isGallerySketchActive: true,
			hasLocalSketch: false,
		});

		expect(button.disabled).toBe(true);
		expect(button.parentElement?.getAttribute('aria-label')).toBe('no locally saved sketch yet');
	});

	it('restores and closes when both an active gallery sketch and local code are available', () => {
		const onRestoreLocalSketch = vi.fn(() => true);
		const onClose = vi.fn();
		const { button } = renderPreferences({
			isGallerySketchActive: true,
			hasLocalSketch: true,
			onRestoreLocalSketch,
			onClose,
		});

		expect(button.disabled).toBe(false);
		expect(button.parentElement?.hasAttribute('aria-label')).toBe(false);

		act(() => button.click());
		expect(onRestoreLocalSketch).toHaveBeenCalledOnce();
		expect(onClose).toHaveBeenCalledOnce();
	});
});

function renderPreferences(
	overrides: Partial<{
		isGallerySketchActive: boolean;
		hasLocalSketch: boolean;
		onRestoreLocalSketch: () => boolean;
		onClose: () => void;
	}>
): { button: HTMLButtonElement } {
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	mountedRoots.push({ container, root });

	act(() => {
		root.render(
			createElement(PreferencesTab, {
				settings: DEFAULT_SETTINGS,
				onSettingsChange: vi.fn(),
				onResetRunners: vi.fn(),
				isGallerySketchActive: false,
				hasLocalSketch: false,
				onRestoreLocalSketch: vi.fn(() => false),
				onClose: vi.fn(),
				...overrides,
			})
		);
	});

	const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
		candidate.textContent?.includes('return to local')
	);
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error('Expected the return-to-local button');
	}

	return { button };
}
