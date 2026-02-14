import type { StrudelHapDto } from '@synth.textmode.art/contracts/runner/strudel';
import type { StrudelPatternLike } from '@/engines/strudel/strudel.types';

export function collectHapsFromPattern(pattern: StrudelPatternLike | undefined, cycle: number): StrudelHapDto[] | undefined {
	if (!pattern?.queryArc) return undefined;

	const begin = Math.max(0, cycle - 1);
	const end = cycle + 0.5;
	const haps = pattern.queryArc(begin, end);
	const normalized: StrudelHapDto[] = [];

	for (const hap of haps) {
		const rawWholeBegin = hap.whole?.begin?.valueOf?.();
		const rawWholeEnd = hap.whole?.end?.valueOf?.();
		if (!Number.isFinite(rawWholeBegin) || !Number.isFinite(rawWholeEnd)) {
			continue;
		}

		const wholeBegin = Number(rawWholeBegin);
		const wholeEnd = Number(rawWholeEnd);
		if (wholeBegin >= wholeEnd) {
			continue;
		}

		const locations = (hap.context?.locations ?? [])
			.filter((location) => Number.isFinite(location.start) && Number.isFinite(location.end) && location.start < location.end)
			.map((location) => ({ start: location.start, end: location.end }));

		if (locations.length === 0) continue;

		normalized.push({
			begin: wholeBegin,
			end: wholeEnd,
			locations,
		});
	}

	return normalized.length > 0 ? normalized : undefined;
}
