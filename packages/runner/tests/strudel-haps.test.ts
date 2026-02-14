import { describe, expect, it } from 'vitest';
import { collectHapsFromPattern } from '../src/strudel/serialization/haps';

describe('strudel hap serialization', () => {
	it('collects normalized haps from queryArc', () => {
		const haps = collectHapsFromPattern(
			{
				queryArc: () => [
					{
						whole: { begin: { valueOf: () => 2 }, end: { valueOf: () => 3 } },
						context: { locations: [{ start: 10, end: 20 }] },
					},
				],
			},
			2.5
		);

		expect(haps).toEqual([{ begin: 2, end: 3, locations: [{ start: 10, end: 20 }] }]);
	});

	it('drops invalid haps with missing/invalid ranges', () => {
		const haps = collectHapsFromPattern(
			{
				queryArc: () => [
					{
						whole: { begin: { valueOf: () => 3 }, end: { valueOf: () => 2 } },
						context: { locations: [{ start: 10, end: 20 }] },
					},
					{
						whole: { begin: { valueOf: () => 1 }, end: { valueOf: () => 2 } },
						context: { locations: [{ start: 5, end: 5 }] },
					},
				],
			},
			1
		);

		expect(haps).toBeUndefined();
	});
});
