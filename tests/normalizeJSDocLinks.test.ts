import { describe, expect, it } from 'vitest';
import { normalizeJSDocLinks } from '../scripts/lib/normalizeJSDocLinks.js';

describe('normalizeJSDocLinks', () => {
	it('rewrites external @see links with labels into markdown links', () => {
		const input =
			'* @see {@link https://code.textmode.art/api/textmode.js/namespaces/layering/classes/TextmodeLayer/methods/draw | layering.TextmodeLayer.draw API reference}';

		expect(normalizeJSDocLinks(input)).toBe(
			'* @see [layering.TextmodeLayer.draw API reference](https://code.textmode.art/api/textmode.js/namespaces/layering/classes/TextmodeLayer/methods/draw)'
		);
	});

	it('rewrites bare external URLs into markdown links', () => {
		const input = '* @see {@link https://example.com/docs}';

		expect(normalizeJSDocLinks(input)).toBe('* @see [https://example.com/docs](https://example.com/docs)');
	});

	it('rewrites internal symbol links in prose into code spans', () => {
		const input = '* Rendering can be resumed later with {@link loop}.';

		expect(normalizeJSDocLinks(input)).toBe('* Rendering can be resumed later with `loop`.');
	});

	it('rewrites internal symbol links with custom labels into code spans', () => {
		const input = '* Alias for {@link cellColor | fill}.';

		expect(normalizeJSDocLinks(input)).toBe('* Alias for `fill`.');
	});

	it('rewrites links inside deprecated, returns, and list content', () => {
		const input = [
			'* @deprecated Use {@link ExportPlugin} directly instead.',
			'* @returns A compiled shader ready for use with {@link shader}.',
			'* - {@link BrightnessOptions | brightness} - Adjust image brightness',
		].join('\n');

		expect(normalizeJSDocLinks(input)).toBe(
			[
				'* @deprecated Use `ExportPlugin` directly instead.',
				'* @returns A compiled shader ready for use with `shader`.',
				'* - `brightness` - Adjust image brightness',
			].join('\n')
		);
	});

	it('leaves comments without JSDoc links unchanged', () => {
		const input = '* Plain documentation text without inline link tags.';

		expect(normalizeJSDocLinks(input)).toBe(input);
	});
});
