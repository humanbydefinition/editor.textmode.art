import type { MiniLocation } from '@strudel/core';
import type { StrudelMiniLocationDto } from '@synth.textmode.art/contracts/runner/strudel';
import type { StrudelPatternLike } from '@/strudel/runtime/types';

export function serializeMiniLocations(
	miniLocations: Array<MiniLocation | { start?: unknown; end?: unknown }> | undefined
): StrudelMiniLocationDto[] | undefined {
	if (!miniLocations || miniLocations.length === 0) return undefined;

	const serialized: StrudelMiniLocationDto[] = [];

	for (const location of miniLocations) {
		const normalized = normalizeMiniLocation(location);
		if (normalized) {
			serialized.push(normalized);
		}
	}

	return serialized.length > 0 ? serialized : undefined;
}

export function normalizeMiniLocation(
	location: MiniLocation | { start?: unknown; end?: unknown }
): StrudelMiniLocationDto | null {
	const start = (location as { start?: unknown }).start;
	const end = (location as { end?: unknown }).end;
	if (!start || !end) return null;

	if (
		typeof start === 'object' &&
		start !== null &&
		typeof end === 'object' &&
		end !== null &&
		'offset' in start &&
		'offset' in end
	) {
		const startOffset = Number((start as { offset?: unknown }).offset);
		const endOffset = Number((end as { offset?: unknown }).offset);
		if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset) || startOffset >= endOffset) {
			return null;
		}

		const startLine = Number((start as { line?: unknown }).line);
		const startColumn = Number((start as { column?: unknown }).column);
		const endLine = Number((end as { line?: unknown }).line);
		const endColumn = Number((end as { column?: unknown }).column);

		return {
			start: {
				line: Number.isFinite(startLine) ? startLine : 1,
				column: Number.isFinite(startColumn) ? startColumn : 1,
				offset: startOffset,
			},
			end: {
				line: Number.isFinite(endLine) ? endLine : 1,
				column: Number.isFinite(endColumn) ? endColumn : 1,
				offset: endOffset,
			},
		};
	}

	const startOffset = Number(start);
	const endOffset = Number(end);
	if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset) || startOffset >= endOffset) {
		return null;
	}

	return {
		start: { line: 1, column: 1, offset: startOffset },
		end: { line: 1, column: 1, offset: endOffset },
	};
}

export function collectMiniLocationsFromPattern(pattern: StrudelPatternLike | undefined): StrudelMiniLocationDto[] | undefined {
	if (!pattern?.queryArc) return undefined;

	const dedup = new Map<string, StrudelMiniLocationDto>();
	const haps = pattern.queryArc(0, 32);

	for (const hap of haps) {
		const locations = hap.context?.locations;
		if (!locations || locations.length === 0) continue;

		for (const location of locations) {
			const start = location.start;
			const end = location.end;
			if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue;

			const key = `${start}:${end}`;
			if (dedup.has(key)) continue;

			dedup.set(key, {
				start: { line: 1, column: 1, offset: start },
				end: { line: 1, column: 1, offset: end },
			});
		}
	}

	if (dedup.size === 0) return undefined;
	return Array.from(dedup.values());
}
