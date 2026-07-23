import parseGlsl from '@shaderfrog/glsl-parser/parser/index.js';
import { describe, expect, it } from 'vitest';
import { CodeRandomizer } from '../src/app/runtime/CodeRandomizer';

describe('CodeRandomizer', () => {
	it('protects structural GLSL numbers while mutating integer and float expressions', () => {
		const code = `const shader = \`#version 300 es
layout(location = 0) out vec4 color;
uniform vec4 palette[16];
void main() {
	int amount = 4;
	float gain = 10.0;
	color = palette[2] * gain * float(amount);
}\`;`;

		const integerChange = CodeRandomizer.makeRandomChange(code, sequenceRng(0, 0, 0.75));
		const floatChange = CodeRandomizer.makeRandomChange(code, sequenceRng(0.75, 0.999999));

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

		expect(CodeRandomizer.makeRandomChange(code, sequenceRng(0))).toBe(code);
	});

	it('preserves GLSL numeric kinds and handles unary negatives as one target', () => {
		const signed = shaderWithBody('int value = -4;');
		const unsigned = shaderWithBody('uint value = 4u;');

		expect(CodeRandomizer.makeRandomChange(signed, sequenceRng(0, 0, 0.75))).toContain('int value = -3;');
		expect(CodeRandomizer.makeRandomChange(unsigned, sequenceRng(0, 0, 0.75))).toContain('uint value = 5u;');
	});

	it('only targets executable JavaScript numbers outside embedded text and regex literals', () => {
		const code = [
			'const quoted = "123";',
			'const template = `line 456',
			'next 789`;',
			'const matcher = /[0-9]{2}/;',
			'const value = 10;',
		].join('\n');

		const changed = CodeRandomizer.makeRandomChange(code, sequenceRng(0, 0, 0.75));

		expect(changed).toContain('"123"');
		expect(changed).toContain('line 456\nnext 789');
		expect(changed).toContain('/[0-9]{2}/');
		expect(changed).toContain('const value = 11;');
	});

	it('targets JavaScript expressions inside template interpolation', () => {
		const code = 'const label = `frame ${5}`;';

		expect(CodeRandomizer.makeRandomChange(code, sequenceRng(0, 0, 0.75))).toBe('const label = `frame ${6}`;');
	});

	it('finds blend modes structurally without matching strings or URL text', () => {
		const code = [
			'const fake = "blendMode: \'screen\'";',
			'const url = "https://textmode.art";',
			"const options = { blendMode: 'multiply' };",
			"layer.blendMode('screen');",
		].join('\n');

		const propertyChange = CodeRandomizer.makeRandomChange(code, sequenceRng(0, 0));
		const methodChange = CodeRandomizer.makeRandomChange(code, sequenceRng(0.75, 0));

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

		expect(CodeRandomizer.makeRandomChange(invalidJavaScript, sequenceRng(0))).toBe(invalidJavaScript);
		expect(CodeRandomizer.makeRandomChange(invalidGlsl, sequenceRng(0))).toBe(invalidGlsl);
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
		const uniqueChanges = new Set<string>();

		for (let index = 0; index < 128; index++) {
			const changed = CodeRandomizer.makeRandomChange(code, sequenceRng(index / 128, 0.99, 0.99));
			uniqueChanges.add(changed);
			expect(changed).toContain('#version 300 es');
			expect(changed).toContain('layout(location = 0)');
			expect(changed).toContain('palette[16]');
			expect(changed).toContain('palette[3]');
			expect(changed).toContain('case 2:');
			expect(() => parseGlsl(extractTemplate(changed), { quiet: true, stage: 'either' })).not.toThrow();
		}

		expect(uniqueChanges).toHaveLength(6);
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
