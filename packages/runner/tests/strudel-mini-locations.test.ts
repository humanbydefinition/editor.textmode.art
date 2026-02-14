import { describe, expect, it } from 'vitest';
import { collectMiniLocationsFromPattern, normalizeMiniLocation, serializeMiniLocations } from '../src/strudel/serialization/miniLocations';

describe('strudel mini location serialization', () => {
	it('normalizes classic mini location shape', () => {
		const normalized = normalizeMiniLocation({
			start: { line: 2, column: 3, offset: 10 },
			end: { line: 2, column: 8, offset: 20 },
		});
		expect(normalized).toEqual({
			start: { line: 2, column: 3, offset: 10 },
			end: { line: 2, column: 8, offset: 20 },
		});
	});

	it('serializes simplified numeric shape', () => {
		const serialized = serializeMiniLocations([{ start: 5, end: 15 }]);
		expect(serialized).toEqual([{ start: { line: 1, column: 1, offset: 5 }, end: { line: 1, column: 1, offset: 15 } }]);
	});

	it('collects deduped locations from pattern haps', () => {
		const locations = collectMiniLocationsFromPattern({
			queryArc: () => [
				{ context: { locations: [{ start: 1, end: 4 }, { start: 1, end: 4 }, { start: 10, end: 20 }] } },
			],
		});
		expect(locations).toEqual([
			{ start: { line: 1, column: 1, offset: 1 }, end: { line: 1, column: 1, offset: 4 } },
			{ start: { line: 1, column: 1, offset: 10 }, end: { line: 1, column: 1, offset: 20 } },
		]);
	});
});
