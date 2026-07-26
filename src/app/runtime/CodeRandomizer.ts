import { collectGlslTargets } from './code-randomizer/glslTargets';
import { collectJavaScriptTargets } from './code-randomizer/javascriptTargets';
import type {
	HexColorMutationTarget,
	MutationTarget,
	NumericMutationTarget,
	RandomSource,
} from './code-randomizer/types';

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
const JAVASCRIPT_INTEGER_MIN = Number.MIN_SAFE_INTEGER;
const JAVASCRIPT_INTEGER_MAX = Number.MAX_SAFE_INTEGER;
const GLSL_INTEGER_MIN = -2_147_483_648;
const GLSL_INTEGER_MAX = 2_147_483_647;
const GLSL_UNSIGNED_INTEGER_MAX = 4_294_967_295;
const GLSL_FLOAT_MAX = 3.402823466e38;

/**
 * Makes a single syntax-aware random change to JavaScript or embedded GLSL.
 * Returns the original source when either language cannot be parsed safely.
 */
export function makeRandomChange(code: string, rng: RandomSource = Math.random): string {
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
	try {
		targets.sort((left, right) => left.start - right.start);
		const target = targets[randomIndex(targets.length, rng)];
		const replacement = mutateTarget(target, rng);
		const candidate = code.slice(0, target.start) + replacement + code.slice(target.end);

		return isParseableCandidate(candidate) ? candidate : code;
	} catch {
		return code;
	}
}

function mutateTarget(target: MutationTarget, rng: RandomSource): string {
	switch (target.kind) {
		case 'number':
			return mutateNumber(target, rng);
		case 'blendMode':
			return mutateBlendMode(target.text, rng);
		case 'hexColor':
			return mutateHexColor(target, rng);
		default:
			return assertNever(target);
	}
}

function mutateNumber(target: NumericMutationTarget, rng: RandomSource): string {
	if (target.numericKind === 'float') {
		return formatFloat(mutateFloat(target, rng), target);
	}

	const nextValue = mutateInteger(target, rng);
	if (target.language === 'glsl' && target.numericKind === 'unsignedInteger') {
		const suffix = target.text.endsWith('U') ? 'U' : 'u';
		return `${nextValue}${suffix}`;
	}
	return nextValue.toString();
}

function mutateInteger(target: NumericMutationTarget, rng: RandomSource): number {
	const variation = Math.floor(rng() * 10) + 1;
	const sign = rng() < 0.5 ? -1 : 1;
	const [minimum, maximum] = integerBounds(target);
	let nextValue = clampInteger(target.value + variation * sign, minimum, maximum);
	if (nextValue === target.value) {
		nextValue = clampInteger(target.value - variation * sign, minimum, maximum);
	}
	return nextValue;
}

function mutateFloat(target: NumericMutationTarget, rng: RandomSource): number {
	const value = target.value;
	const maximum = target.language === 'glsl' ? GLSL_FLOAT_MAX : Number.MAX_VALUE;
	const delta = Math.max(Math.abs(value) * 0.1, 0.1);
	const variation = (rng() * 2 - 1) * delta;
	let nextValue = clampFloat(Number.parseFloat((value + variation).toFixed(4)), maximum);
	if (nextValue === value) {
		nextValue = clampFloat(Number.parseFloat((value - Math.sign(variation || 1) * delta).toFixed(4)), maximum);
	}
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

function mutateHexColor(target: HexColorMutationTarget, rng: RandomSource): string {
	const digits = target.text.slice(1);
	const rgbLength = digits.length <= 4 ? 3 : 6;
	const channelWidth = rgbLength === 3 ? 1 : 2;
	const channelRange = channelWidth === 1 ? 16 : 256;
	const originalRgb = digits.slice(0, rgbLength);
	const alpha = digits.slice(rgbLength);
	const uppercase = /[A-F]/.test(digits) && !/[a-f]/.test(digits);
	const channels = Array.from({ length: 3 }, () =>
		randomIndex(channelRange, rng).toString(16).padStart(channelWidth, '0')
	);

	let rgb = channels.join('');
	if (rgb.toLowerCase() === originalRgb.toLowerCase()) {
		const nextRed = (Number.parseInt(channels[0], 16) + 1) % channelRange;
		channels[0] = nextRed.toString(16).padStart(channelWidth, '0');
		rgb = channels.join('');
	}
	if (uppercase) rgb = rgb.toUpperCase();

	return `#${rgb}${alpha}`;
}

function randomIndex(length: number, rng: RandomSource): number {
	return Math.min(length - 1, Math.max(0, Math.floor(rng() * length)));
}

function assertNever(value: never): never {
	throw new Error(`Unsupported mutation target: ${JSON.stringify(value)}`);
}

function integerBounds(target: NumericMutationTarget): readonly [number, number] {
	if (target.language === 'javascript') {
		return [JAVASCRIPT_INTEGER_MIN, JAVASCRIPT_INTEGER_MAX];
	}
	if (target.numericKind === 'unsignedInteger') {
		return [0, GLSL_UNSIGNED_INTEGER_MAX];
	}
	return [GLSL_INTEGER_MIN, GLSL_INTEGER_MAX];
}

function clampInteger(value: number, minimum: number, maximum: number): number {
	return Math.round(Math.min(maximum, Math.max(minimum, value)));
}

function clampFloat(value: number, maximum: number): number {
	if (Number.isNaN(value)) return 0;
	return Math.min(maximum, Math.max(-maximum, value));
}

function isParseableCandidate(code: string): boolean {
	try {
		const javascript = collectJavaScriptTargets(code, VALID_BLEND_MODES);
		for (const template of javascript.glslTemplates) {
			collectGlslTargets(template);
		}
		return true;
	} catch {
		return false;
	}
}
