import { describe, expect, it } from 'vitest';
import { EDITOR_TYPES_HELP, parseEditorTypesCliArgs } from './cli.js';

describe('editor types CLI', () => {
	it('accepts the default generation command and help aliases', () => {
		expect(parseEditorTypesCliArgs([])).toEqual({ help: false });
		expect(parseEditorTypesCliArgs(['--help'])).toEqual({ help: true });
		expect(parseEditorTypesCliArgs(['-h'])).toEqual({ help: true });
		expect(EDITOR_TYPES_HELP).toContain('npm run extract-types');
	});

	it('rejects unknown, positional, and duplicate arguments', () => {
		expect(() => parseEditorTypesCliArgs(['--unknown'])).toThrow();
		expect(() => parseEditorTypesCliArgs(['unexpected'])).toThrow();
		expect(() => parseEditorTypesCliArgs(['--help', '-h'])).toThrow('Option --help may only be provided once.');
	});
});
