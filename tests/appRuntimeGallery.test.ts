import { describe, expect, it, vi } from 'vitest';
import { AppRuntime } from '../src/app/runtime/AppRuntime';
import type { GallerySketch } from '../src/features/gallery-sketches';

const { replaceAndRun } = vi.hoisted(() => ({ replaceAndRun: vi.fn() }));

vi.mock('@/textmode/TextmodeEngine', () => {
	class TextmodeEngine {
		dispose = vi.fn();
		getCode = vi.fn(() => '');
		getController = vi.fn(() => ({ replaceAndRun }));
		getEditor = vi.fn(() => null);
		init = vi.fn(async () => {});
		isInitialized = vi.fn(() => true);
		sendAudioData = vi.fn();
	}

	return { TextmodeEngine };
});

describe('AppRuntime gallery loading', () => {
	it('replaces and restarts the runtime when applying a gallery sketch', () => {
		const appRuntime = new AppRuntime();
		const sketch: GallerySketch = {
			status: 'APPROVED',
			slug: 'textmodeshift',
			title: 'TEXTMODESHIFT',
			description: null,
			authorName: null,
			license: null,
			socialLinks: null,
			createdAt: '2026-07-19T00:00:00.000Z',
			textmodeCode: 't.setup(async () => {});',
		};

		callPrivate(appRuntime, 'applyGallerySketch', sketch);

		expect(replaceAndRun).toHaveBeenCalledWith(sketch.textmodeCode, 'restart');
	});
});

function callPrivate<T>(runtime: AppRuntime, methodName: string, ...args: unknown[]): T {
	return (runtime as unknown as Record<string, (...methodArgs: unknown[]) => T>)[methodName](...args);
}
