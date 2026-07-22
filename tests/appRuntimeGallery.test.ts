import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRuntime } from '../src/app/runtime/AppRuntime';
import type { GallerySketch } from '../src/features/gallery-sketches';

const { reloadSandbox, replaceAndRun } = vi.hoisted(() => ({ reloadSandbox: vi.fn(), replaceAndRun: vi.fn() }));

vi.mock('@/textmode/TextmodeEngine', () => {
	class TextmodeEngine {
		dispose = vi.fn();
		getCode = vi.fn(() => '');
		getController = vi.fn(() => ({ replaceAndRun }));
		getEditor = vi.fn(() => null);
		init = vi.fn(async () => {});
		isInitialized = vi.fn(() => true);
		reloadSandbox = reloadSandbox;
		sendAudioData = vi.fn();
	}

	return { TextmodeEngine };
});

describe('AppRuntime gallery loading', () => {
	beforeEach(() => {
		reloadSandbox.mockClear();
		replaceAndRun.mockClear();
	});

	it('replaces code and resets the runtime in place when applying a gallery sketch', () => {
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

		expect(replaceAndRun).toHaveBeenCalledWith(sketch.textmodeCode, 'reset-runtime');
		expect(reloadSandbox).not.toHaveBeenCalled();
	});

	it('resets workspace code in place but reloads the sandbox for explicit recovery', () => {
		const appRuntime = new AppRuntime();

		callPrivate(appRuntime, 'clearStorage');

		expect(replaceAndRun).toHaveBeenCalledWith(expect.any(String), 'reset');
		expect(reloadSandbox).not.toHaveBeenCalled();

		callPrivate(appRuntime, 'reloadTextmodeSandbox');
		expect(reloadSandbox).toHaveBeenCalledOnce();
	});
});

function callPrivate<T>(runtime: AppRuntime, methodName: string, ...args: unknown[]): T {
	return (runtime as unknown as Record<string, (...methodArgs: unknown[]) => T>)[methodName](...args);
}
