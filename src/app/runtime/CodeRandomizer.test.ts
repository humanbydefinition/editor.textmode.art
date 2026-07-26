import { parse } from 'acorn';
import parseGlsl from '@shaderfrog/glsl-parser/parser/index.js';
import { describe, expect, it } from 'vitest';
import { makeRandomChange } from './CodeRandomizer';

describe('makeRandomChange', () => {
	it('protects structural GLSL numbers while mutating integer and float expressions', () => {
		const code = `const shader = \`#version 300 es
layout(location = 0) out vec4 color;
uniform vec4 palette[16];
void main() {
	int amount = 4;
	float gain = 10.0;
	color = palette[2] * gain * float(amount);
}\`;`;

		const integerChange = makeRandomChange(code, sequenceRng(0, 0, 0.75));
		const floatChange = makeRandomChange(code, sequenceRng(0.75, 0.999999));

		expect(integerChange).toContain('int amount = 5;');
		expect(floatChange).toContain('float gain = 11.0;');
		for (const changed of [integerChange, floatChange]) {
			expect(changed).toContain('#version 300 es');
			expect(changed).toContain('layout(location = 0)');
			expect(changed).toContain('palette[16]');
			expect(changed).toContain('palette[2]');
		}
	});

	it('leaves GLSL unchanged when it contains only structural numbers', () => {
		const code = `const shader = \`#version 300 es
layout(location = 0) out vec4 color;
uniform vec4 palette[16];
void main() {
	color = palette[index];
	switch (index) { case 2: break; }
}\`;`;

		expect(makeRandomChange(code, sequenceRng(0))).toBe(code);
	});

	it('preserves GLSL numeric kinds and handles unary negatives as one target', () => {
		const signed = shaderWithBody('int value = -4;');
		const unsigned = shaderWithBody('uint value = 4u;');

		expect(makeRandomChange(signed, sequenceRng(0, 0, 0.75))).toContain('int value = -3;');
		expect(makeRandomChange(unsigned, sequenceRng(0, 0, 0.75))).toContain('uint value = 5u;');
	});

	it('only targets executable JavaScript numbers outside embedded text and regex literals', () => {
		const code = [
			'const quoted = "123";',
			'const template = `line 456',
			'next 789`;',
			'const matcher = /[0-9]{2}/;',
			'const value = 10;',
		].join('\n');

		const changed = makeRandomChange(code, sequenceRng(0, 0, 0.75));

		expect(changed).toContain('"123"');
		expect(changed).toContain('line 456\nnext 789');
		expect(changed).toContain('/[0-9]{2}/');
		expect(changed).toContain('const value = 11;');
	});

	it('targets JavaScript expressions inside template interpolation', () => {
		const code = 'const label = `frame ${5}`;';

		expect(makeRandomChange(code, sequenceRng(0, 0, 0.75))).toBe('const label = `frame ${6}`;');
	});

	it('randomizes every supported hex width in quoted strings and static templates', () => {
		const delimiters = ["'", '"', '`'] as const;
		const cases = [
			{ source: '#123', expected: '#a0f', random: [10 / 16, 0, 15 / 16] },
			{ source: '#1234', expected: '#a0f4', random: [10 / 16, 0, 15 / 16] },
			{ source: '#1A2B3C', expected: '#AB00FF', random: [171 / 256, 0, 255 / 256] },
			{ source: '#1A2B3CAA', expected: '#AB00FFAA', random: [171 / 256, 0, 255 / 256] },
		] as const;

		for (const delimiter of delimiters) {
			for (const testCase of cases) {
				const code = `const color = ${delimiter}${testCase.source}${delimiter};`;
				const changed = makeRandomChange(code, sequenceRng(0, ...testCase.random));

				expect(changed).toBe(`const color = ${delimiter}${testCase.expected}${delimiter};`);
			}
		}
	});

	it('preserves alpha and casing policy while guaranteeing a different RGB value', () => {
		expect(makeRandomChange("const color = '#00000080';", sequenceRng(0, 0, 0, 0))).toBe(
			"const color = '#01000080';"
		);
		expect(makeRandomChange("const color = '#ABCDEF80';", sequenceRng(0, 171 / 256, 205 / 256, 239 / 256))).toBe(
			"const color = '#ACCDEF80';"
		);
		expect(makeRandomChange("const color = '#aBcDeF80';", sequenceRng(0, 171 / 256, 205 / 256, 239 / 256))).toBe(
			"const color = '#accdef80';"
		);
	});

	it('recognizes decoded hex values while replacing their complete source literal contents', () => {
		const code = String.raw`const color = '\x23fff';`;

		expect(makeRandomChange(code, sequenceRng(0, 10 / 16, 0, 15 / 16))).toBe("const color = '#a0f';");
	});

	it('ignores non-exact, invalid, interpolated, commented, and GLSL hash text', () => {
		const code = [
			"// const commented = '#fff';",
			"const url = 'https://example.com/#fff';",
			"const sentence = 'color #fff';",
			"const tooShort = '#ff';",
			"const tooLong = '#fffffffff';",
			"const invalid = '#ggg';",
			'const interpolated = `#${channel}ff`;',
			'const shader = `#version 300 es',
			'void main() {}',
			'`;',
		].join('\n');

		expect(makeRandomChange(code, sequenceRng(0))).toBe(code);
	});

	it('selects one target uniformly from mixed number, color, and blend-mode targets', () => {
		const code = "const size = 1; const color = '#000'; const options = { blendMode: 'normal' };";

		expect(makeRandomChange(code, sequenceRng(0.5, 10 / 16, 0, 15 / 16))).toBe(
			"const size = 1; const color = '#a0f'; const options = { blendMode: 'normal' };"
		);
	});

	it('reproduces the textmodeshift computed-index mutation deterministically', () => {
		const code = ['const rect = rectangles.splice(largest, amount)[0];', 'splitRectangle(rect);'].join('\n');

		expect(makeRandomChange(code, sequenceRng(0, 0.4, 0.75))).toContain('rectangles.splice(largest, amount)[5]');
	});

	it('finds blend modes structurally without matching strings or URL text', () => {
		const code = [
			'const fake = "blendMode: \'screen\'";',
			'const url = "https://textmode.art";',
			"const options = { blendMode: 'multiply' };",
			"layer.blendMode('screen');",
		].join('\n');

		const propertyChange = makeRandomChange(code, sequenceRng(0, 0));
		const methodChange = makeRandomChange(code, sequenceRng(0.75, 0));

		expect(propertyChange).toContain('const fake = "blendMode: \'screen\'";');
		expect(propertyChange).toContain("blendMode: 'normal'");
		expect(methodChange).toContain("layer.blendMode('normal')");
	});

	it('fails closed for invalid JavaScript or recognized GLSL', () => {
		const invalidJavaScript = 'const value = ; 42';
		const invalidGlsl = `const value = 42;
const shader = \`#version 300 es
void main() { float broken = ; }
\`;`;

		expect(makeRandomChange(invalidJavaScript, sequenceRng(0))).toBe(invalidJavaScript);
		expect(makeRandomChange(invalidGlsl, sequenceRng(0))).toBe(invalidGlsl);
	});

	it('keeps every structural range protected while every eligible shader target remains parseable', () => {
		const code = `const shader = \`#version 300 es
layout(location = 0) out vec4 color;
uniform vec4 palette[16];
void main() {
	int mode = 2;
	float phase = 0.5;
	uint seed = 4u;
	vec4 sampleColor = palette[3];
	switch (mode) { case 2: phase += 0.25; break; }
	color = sampleColor + vec4(phase, float(seed), 1.0, 1.0);
}\`;`;
		const changes = Array.from({ length: 6 }, (_, index) =>
			makeRandomChange(code, sequenceRng((index + 0.5) / 6, 0.99, 0.99))
		);

		for (const changed of changes) {
			expect(changed).toContain('#version 300 es');
			expect(changed).toContain('layout(location = 0)');
			expect(changed).toContain('palette[16]');
			expect(changed).toContain('palette[3]');
			expect(changed).toContain('case 2:');
			expect(() => parseGlsl(extractTemplate(changed), { quiet: true, stage: 'either' })).not.toThrow();
		}

		expect(new Set(changes)).toHaveLength(6);
	});

	it('keeps integer mutations inside JavaScript and GLSL representable ranges', () => {
		const javascript = 'const value = 9007199254740991;';
		const glslSigned = shaderWithBody('int value = 2147483647;');
		const glslUnsigned = shaderWithBody('uint value = 4294967295u;');

		expect(makeRandomChange(javascript, sequenceRng(0, 0.99, 0.99))).toContain('9007199254740981');
		expect(makeRandomChange(glslSigned, sequenceRng(0, 0.99, 0.99))).toContain('2147483637');
		expect(makeRandomChange(glslUnsigned, sequenceRng(0, 0.99, 0.99))).toContain('4294967285u');
	});

	it.each([
		['JavaScript integer', 0.5 / 6, 'amount: 22'],
		['JavaScript float', 1.5 / 6, 'gain: 0.85'],
		['short hex color', 2.5 / 6, "'#fff'"],
		['long hex color with alpha', 3.5 / 6, "'#FFFFFF80'"],
		['GLSL integer', 4.5 / 6, 'int amount = 14'],
		['GLSL float', 5.5 / 6, 'float gain = 0.35'],
	])('keeps %s mutations parseable', (_target, selection, expected) => {
		const source = `const settings = { amount: 12, gain: 0.75 };
const palette = ['#123', '#AABBCC80'];
const shader = \`#version 300 es
precision highp float;
layout(location = 0) out vec4 color;
void main() {
	int amount = 4;
	float gain = 0.25;
	color = vec4(gain * float(amount));
}\`;`;

		const changed = makeRandomChange(source, sequenceRng(selection, 0.999999, 0.999999, 0.999999));

		expect(changed).toContain(expected);
		expect(() =>
			parse(changed, {
				ecmaVersion: 'latest',
				sourceType: 'script',
			})
		).not.toThrow();
		expect(() => parseGlsl(extractTemplate(changed), { quiet: true, stage: 'either' })).not.toThrow();
	});
});

function shaderWithBody(body: string): string {
	return `const shader = \`#version 300 es
void main() { ${body} }
\`;`;
}

function sequenceRng(...values: number[]): () => number {
	let index = 0;
	return () => values[index++] ?? 0;
}

function extractTemplate(code: string): string {
	return code.slice(code.indexOf('`') + 1, code.lastIndexOf('`'));
}
