import { describe, expect, it } from 'vitest';

const gallerySketches = import.meta.glob<string>('../../sketches/*/sketch.js', {
	eager: true,
	import: 'default',
	query: '?raw',
});

describe('gallery sketch determinism', () => {
	it('does not use ambient entropy sources', () => {
		const ambientEntropy = Object.entries(gallerySketches)
			.filter(([, code]) =>
				/\b(?:Math\.random|Date\.now|performance\.now|crypto\.(?:getRandomValues|randomUUID))\s*\(/.test(code)
			)
			.map(([path]) => path);

		expect(ambientEntropy).toEqual([]);
	});

	it('seeds every textmode random and noise source it consumes', () => {
		const unseededRandom = Object.entries(gallerySketches)
			.filter(([, code]) => /\bt\.random\s*\(/.test(code) && !/\bt\.randomSeed\s*\(/.test(code))
			.map(([path]) => path);
		const unseededNoise = Object.entries(gallerySketches)
			.filter(([, code]) => /\bt\.noise\s*\(/.test(code) && !/\bt\.noiseSeed\s*\(/.test(code))
			.map(([path]) => path);

		expect(unseededRandom).toEqual([]);
		expect(unseededNoise).toEqual([]);
	});
});
