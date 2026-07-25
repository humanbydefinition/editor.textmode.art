import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { transformDeclaration } from './declaration-transform.js';

describe('declaration transformation', () => {
	it('removes prefixed functions and members without rewriting unrelated TypeScript', () => {
		const source = `
/** Hidden function. */
export declare function _hidden<T extends { value: string }>(
	input: T
): T;
export declare function visible<T>(input: T): T;

export declare class Demo {
	/** Hidden field. */
	private _field;
	readonly $callable?: <T>(input: T) => T;
	get _secret(): string;
	set _secret(value: string);
	visible(value: string): void;
	constructor(_value: string, value: number);
}

export interface Shape {
	'_quoted': string;
	normal: string;
}

export type Inline = {
	$method(): void;
	ok: string;
};

export declare const _ordinary: string;
export declare const declarationLikeText: "_fake(): void;";
`.trimStart();

		const result = transformDeclaration('fixture.d.ts', source);

		expect(result.removedDeclarationCount).toBe(7);
		expect(result.content).not.toContain('function _hidden');
		expect(result.content).not.toContain('_field');
		expect(result.content).not.toContain('$callable');
		expect(result.content).not.toContain('_secret');
		expect(result.content).not.toContain("'_quoted'");
		expect(result.content).not.toContain('$method');
		expect(result.content).toContain('function visible<T>(input: T): T;');
		expect(result.content).toContain('constructor(_value: string, value: number);');
		expect(result.content).toContain('declare const _ordinary: string;');
		expect(result.content).toContain('"_fake(): void;"');
		expect(parseDiagnostics(result.content)).toEqual([]);
	});

	it('removes parsed example tags and normalizes links only inside JSDoc', () => {
		const source = `
/**
 * Uses {@link other}.
 * @example
 * demo({ link: '{@link untouched}' });
 * @deprecated Prefer {@link newer}.
 * @see {@link https://example.com/docs | Demo [API] reference}
 */
export declare function demo(value: { link: string }): void;
export declare const literal: "{@link untouched}";
`.trimStart();

		const result = transformDeclaration('docs.d.ts', source);

		expect(result.removedExampleCount).toBe(1);
		expect(result.normalizedLinkCount).toBe(3);
		expect(result.content).not.toContain('@example');
		expect(result.content).not.toContain('demo({ link:');
		expect(result.content).toContain('Uses `other`.');
		expect(result.content).toContain('Prefer `newer`.');
		expect(result.content).toContain('[Demo \\[API\\] reference](https://example.com/docs)');
		expect(result.content).toContain('const literal: "{@link untouched}"');
	});

	it.each([
		[
			'external link',
			'* @see {@link https://example.com/docs}',
			'* @see [https://example.com/docs](https://example.com/docs)',
		],
		['plain internal link', '* See {@linkplain Demo}.', '* See Demo.'],
		['code link', '* See {@linkcode Demo}.', '* See `Demo`.'],
		['custom label', '* Alias for {@link cellColor | fill}.', '* Alias for `fill`.'],
	])('normalizes %s', (_label, input, expected) => {
		const result = transformDeclaration('link.d.ts', `/**\n ${input}\n */\nexport declare const value: string;`);
		expect(result.content).toContain(expected);
	});

	it('rejects malformed input with its source location', () => {
		expect(() => transformDeclaration('broken.d.ts', 'export interface Broken { value: ; }')).toThrow(
			/Invalid declaration source in broken\.d\.ts:1:\d+/
		);
	});
});

function parseDiagnostics(content: string): readonly ts.Diagnostic[] {
	const sourceFile = ts.createSourceFile('result.d.ts', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	return (sourceFile as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
}
