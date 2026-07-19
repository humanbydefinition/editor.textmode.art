import { describe, expect, it, vi } from 'vitest';
import { AppRuntime } from '../src/app/runtime/AppRuntime';
import type { GallerySketch } from '../src/features/gallery-sketches';

vi.mock('@/textmode/TextmodeEngine', () => {
	class TextmodeEngine {
		readonly runtime = {
			forceRun: vi.fn(),
			hardReset: vi.fn(),
		};

		dispose = vi.fn();
		getCode = vi.fn(() => '');
		getController = vi.fn(() => null);
		getEditor = vi.fn(() => null);
		getRuntime = vi.fn(() => this.runtime);
		init = vi.fn(async () => {});
		isInitialized = vi.fn(() => true);
		reconnectRuntime = vi.fn();
		sendAudioData = vi.fn();
		setCode = vi.fn();
	}

	return { TextmodeEngine };
});

describe('AppRuntime gallery loading', () => {
	it('hard-resets the runtime when applying a gallery sketch', () => {
		const appRuntime = new AppRuntime();
		const engine = (
			appRuntime as unknown as {
				textmodeEngine: {
					getRuntime: () => { forceRun: ReturnType<typeof vi.fn>; hardReset: ReturnType<typeof vi.fn> };
					setCode: ReturnType<typeof vi.fn>;
				};
			}
		).textmodeEngine;
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

		expect(engine.setCode).toHaveBeenCalledWith(sketch.textmodeCode, { silent: true });
		expect(engine.getRuntime().hardReset).toHaveBeenCalledWith(sketch.textmodeCode);
		expect(engine.getRuntime().forceRun).not.toHaveBeenCalled();
	});
});

function callPrivate<T>(runtime: AppRuntime, methodName: string, ...args: unknown[]): T {
	return (runtime as unknown as Record<string, (...methodArgs: unknown[]) => T>)[methodName](...args);
}
