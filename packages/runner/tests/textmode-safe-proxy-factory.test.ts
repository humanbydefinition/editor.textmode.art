// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Textmodifier } from 'textmode.js';
import { SafeProxyFactory } from '../src/engines/textmode/SafeProxyFactory';

function createFactory(): SafeProxyFactory {
	return new SafeProxyFactory({
		onDrawError: vi.fn(),
		hasDrawError: () => false,
	});
}

function createMockTextmode(overrides?: Partial<Record<'loadImage' | 'loadVideo' | 'loadFont', unknown>>): Textmodifier {
	const layer = { draw: vi.fn() };
	const layers = {
		base: layer,
		add: vi.fn(() => layer),
		all: [layer],
	};

	return {
		draw: vi.fn(),
		loadImage: overrides?.loadImage ?? vi.fn(async (src: string) => ({ src, kind: 'image' })),
		loadVideo: overrides?.loadVideo ?? vi.fn(async (src: string) => ({ src, kind: 'video' })),
		loadFont:
			overrides?.loadFont ??
			vi.fn(async (source: unknown) => (typeof source === 'string' ? { src: source, kind: 'font' } : source)),
		layers,
	} as unknown as Textmodifier;
}

describe('SafeProxyFactory media cache', () => {
	it('reuses cached image loads across proxy instances', async () => {
		const factory = createFactory();
		const target = createMockTextmode();
		const firstProxy = factory.createTextmodeProxy(target) as unknown as { loadImage: (src: string) => Promise<unknown> };
		const secondProxy = factory.createTextmodeProxy(target) as unknown as { loadImage: (src: string) => Promise<unknown> };

		const first = await firstProxy.loadImage('https://example.com/asset.png');
		const second = await secondProxy.loadImage('https://example.com/asset.png');

		expect((target as unknown as { loadImage: ReturnType<typeof vi.fn> }).loadImage).toHaveBeenCalledTimes(1);
		expect(first).toBe(second);
	});

	it('evicts failed loads so later retries can succeed', async () => {
		const loadImage = vi
			.fn<(src: string) => Promise<unknown>>()
			.mockRejectedValueOnce(new Error('network failed'))
			.mockResolvedValueOnce({ src: 'https://example.com/asset.png', kind: 'image' });
		const factory = createFactory();
		const target = createMockTextmode({ loadImage });
		const safeT = factory.createTextmodeProxy(target) as unknown as { loadImage: (src: string) => Promise<unknown> };

		await expect(safeT.loadImage('https://example.com/asset.png')).rejects.toThrow('network failed');
		const result = await safeT.loadImage('https://example.com/asset.png');

		expect(loadImage).toHaveBeenCalledTimes(2);
		expect(result).toEqual({ src: 'https://example.com/asset.png', kind: 'image' });
	});

	it('reuses cached textmode loadFont assets while preserving setActive behavior', async () => {
		const loadFont = vi.fn(async (source: unknown, setActive?: boolean) => {
			if (typeof source === 'string') {
				return { src: source, kind: 'font' };
			}
			return source;
		});
		const factory = createFactory();
		const target = createMockTextmode({ loadFont });
		const safeT = factory.createTextmodeProxy(target) as unknown as {
			loadFont: (source: string, setActive?: boolean) => Promise<unknown>;
		};

		await safeT.loadFont('https://example.com/font.bdf', false);
		const second = await safeT.loadFont('https://example.com/font.bdf');

		expect(second).toEqual({ src: 'https://example.com/font.bdf', kind: 'font' });
		expect(loadFont).toHaveBeenCalledTimes(2);
		expect(loadFont.mock.calls[0]).toEqual(['https://example.com/font.bdf', false]);
		expect(loadFont.mock.calls[1]).toEqual([{ src: 'https://example.com/font.bdf', kind: 'font' }, true]);
	});
});
