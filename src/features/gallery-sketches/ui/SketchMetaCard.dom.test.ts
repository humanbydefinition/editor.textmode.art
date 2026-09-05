import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { makeGallerySketch } from '../../../../tests/support/gallery-fixtures';
import { SketchMetaCard } from './SketchMetaCard';

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

describe('SketchMetaCard', () => {
	beforeEach(() => {
		(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
	});

	afterEach(() => {
		for (const { container, root } of mountedRoots.splice(0)) {
			act(() => root.unmount());
			container.remove();
		}
		delete (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
	});

	it('renders the interactive badge with icon and label when interactive is true', () => {
		const sketch = makeGallerySketch({
			title: 'Interactive Test Sketch',
			interactive: true,
		});

		const { container } = renderCard(sketch);

		const badges = Array.from(container.querySelectorAll('span'));
		const interactiveBadge = badges.find((span) => span.textContent?.toLowerCase().includes('interactive'));
		expect(interactiveBadge).not.toBeUndefined();
		expect(interactiveBadge?.querySelector('svg')).not.toBeNull();
	});

	it('does not render the interactive badge when interactive is false or omitted', () => {
		const omittedSketch = makeGallerySketch({
			title: 'Static Sketch',
		});
		const { container: container1 } = renderCard(omittedSketch);
		expect(container1.textContent?.toLowerCase()).not.toContain('interactive');

		const falseSketch = makeGallerySketch({
			title: 'Explicitly False Sketch',
			interactive: false,
		});
		const { container: container2 } = renderCard(falseSketch);
		expect(container2.textContent?.toLowerCase()).not.toContain('interactive');
	});
});

function renderCard(sketch: Parameters<typeof SketchMetaCard>[0]['sketch']): { container: HTMLDivElement } {
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	mountedRoots.push({ container, root });

	act(() => root.render(createElement(SketchMetaCard, { sketch })));

	return { container };
}
