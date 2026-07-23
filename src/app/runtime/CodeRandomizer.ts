import { collectGlslTargets } from './code-randomizer/glslTargets';
import { collectJavaScriptTargets } from './code-randomizer/javascriptTargets';
import type { MutationTarget, NumericMutationTarget, RandomSource } from './code-randomizer/types';

const BLEND_MODES = [
	'normal',
	'additive',
	'multiply',
	'screen',
	'subtract',
	'darken',
	'lighten',
	'overlay',
	'softLight',
	'hardLight',
	'colorDodge',
	'colorBurn',
	'difference',
	'exclusion',
] as const;

const VALID_BLEND_MODES: ReadonlySet<string> = new Set(BLEND_MODES);

/**
 * Service to handle random code modifications.
 * Mimics the "make random change" feature from Hydra.
 */
export class CodeRandomizer {
	/**
	 * Makes a single syntax-aware random change to JavaScript or embedded GLSL.
	 * Returns the original source when either language cannot be parsed safely.
	 */
	static makeRandomChange(code: string, rng: RandomSource = Math.random): string {
		let targets: MutationTarget[];
		try {
			const javascript = collectJavaScriptTargets(code, VALID_BLEND_MODES);
			targets = [...javascript.targets];
			for (const template of javascript.glslTemplates) {
				targets.push(...collectGlslTargets(template));
			}
		} catch {
			return code;
		}

		if (targets.length === 0) return code;
		targets.sort((left, right) => left.start - right.start);
		const target = targets[randomIndex(targets.length, rng)];
		const replacement = target.kind === 'number' ? mutateNumber(target, rng) : mutateBlendMode(target.text, rng);

		return code.slice(0, target.start) + replacement + code.slice(target.end);
	}
}

function mutateNumber(target: NumericMutationTarget, rng: RandomSource): string {
	if (target.numericKind === 'float') {
		return formatFloat(mutateFloat(target.value, rng), target);
	}

	const nextValue = mutateInteger(target.value, rng, target.numericKind === 'unsignedInteger');
	if (target.language === 'glsl' && target.numericKind === 'unsignedInteger') {
		const suffix = target.text.endsWith('U') ? 'U' : 'u';
		return `${nextValue}${suffix}`;
	}
	return nextValue.toString();
}

function mutateInteger(value: number, rng: RandomSource, unsigned: boolean): number {
	const variation = Math.floor(rng() * 10) + 1;
	const sign = rng() < 0.5 ? -1 : 1;
	let nextValue = Math.round(value + variation * sign);
	if (unsigned) nextValue = Math.max(0, nextValue);
	if (nextValue === value) nextValue = value + 1;
	return nextValue;
}

function mutateFloat(value: number, rng: RandomSource): number {
	const delta = Math.max(Math.abs(value) * 0.1, 0.1);
	const variation = (rng() * 2 - 1) * delta;
	let nextValue = Number.parseFloat((value + variation).toFixed(4));
	if (nextValue === value) nextValue = Number.parseFloat((value + 0.1).toFixed(4));
	return Object.is(nextValue, -0) ? 0 : nextValue;
}

function formatFloat(value: number, target: NumericMutationTarget): string {
	let formatted = value.toString();
	if (target.language === 'glsl') {
		if (!/[.eE]/.test(formatted)) formatted += '.0';
		const suffix = target.text.match(/[fF]$/)?.[0];
		if (suffix) formatted += suffix;
	}
	return formatted;
}

function mutateBlendMode(currentMode: string, rng: RandomSource): string {
	const candidates = BLEND_MODES.filter((mode) => mode !== currentMode);
	return candidates[randomIndex(candidates.length, rng)];
}

function randomIndex(length: number, rng: RandomSource): number {
	return Math.min(length - 1, Math.max(0, Math.floor(rng() * length)));
}
