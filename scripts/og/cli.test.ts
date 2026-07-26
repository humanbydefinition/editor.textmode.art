import { describe, expect, it } from 'vitest';
import { parseOgCommand } from './cli';

describe('OG CLI', () => {
	it('parses gallery selection, frame and darken overrides, all mode, and help', () => {
		expect(parseOgCommand(['gallery', 'signal-bloom'])).toEqual({
			kind: 'gallery',
			help: false,
			all: false,
			slug: 'signal-bloom',
			frame: undefined,
			darken: undefined,
		});
		expect(parseOgCommand(['gallery', 'signal-bloom', '--frame', '120'])).toMatchObject({
			slug: 'signal-bloom',
			frame: 120,
			darken: undefined,
		});
		expect(parseOgCommand(['gallery', 'signal-bloom', '--darken', '70'])).toMatchObject({
			slug: 'signal-bloom',
			darken: 70,
		});
		expect(parseOgCommand(['gallery', '--all'])).toEqual({
			kind: 'gallery',
			help: false,
			all: true,
			slug: undefined,
			frame: undefined,
			darken: undefined,
		});
		expect(parseOgCommand(['gallery', '--help']).help).toBe(true);
	});

	it('rejects invalid gallery combinations and options', () => {
		expect(() => parseOgCommand(['gallery'])).toThrow('Provide a sketch slug');
		expect(() => parseOgCommand(['gallery', 'signal-bloom', '--all'])).toThrow('either a sketch slug or --all');
		expect(() => parseOgCommand(['gallery', '--all', '--frame', '10'])).toThrow('--frame cannot be combined');
		expect(() => parseOgCommand(['gallery', '--all', '--darken', '50'])).toThrow('--darken cannot be combined');
		expect(() => parseOgCommand(['gallery', 'signal-bloom', '--frame', '1.5'])).toThrow('integer');
		expect(() => parseOgCommand(['gallery', 'signal-bloom', '--frame', '1001'])).toThrow('1 to 1000');
		expect(() => parseOgCommand(['gallery', 'signal-bloom', '--darken', '1.5'])).toThrow('integer');
		expect(() => parseOgCommand(['gallery', 'signal-bloom', '--darken', '101'])).toThrow('0 to 100');
		expect(() => parseOgCommand(['gallery', 'signal-bloom', '--wat'])).toThrow('Unknown option');
		expect(() => parseOgCommand(['gallery', 'signal-bloom', '--frame=10', '--frame=20'])).toThrow(
			'may only be specified once'
		);
		expect(() => parseOgCommand(['gallery', 'signal-bloom', '--darken=10', '--darken=20'])).toThrow(
			'may only be specified once'
		);
	});

	it('parses site defaults and independent overrides', () => {
		expect(parseOgCommand(['site'])).toEqual({
			kind: 'site',
			help: false,
			sketch: undefined,
			frame: undefined,
			darken: undefined,
		});
		expect(parseOgCommand(['site', '--sketch=textmodeshift', '--frame=120'])).toEqual({
			kind: 'site',
			help: false,
			sketch: 'textmodeshift',
			frame: 120,
			darken: undefined,
		});
		expect(parseOgCommand(['site', '--darken=65'])).toMatchObject({ darken: 65 });
		expect(parseOgCommand(['site', '--help']).help).toBe(true);
	});

	it('rejects invalid, duplicate, unknown, and positional site arguments', () => {
		expect(() => parseOgCommand(['site', '--sketch'])).toThrow();
		expect(() => parseOgCommand(['site', '--sketch', 'Textmode_Mata'])).toThrow('--sketch is invalid');
		expect(() => parseOgCommand(['site', '--sketch=a-sketch', '--sketch=b-sketch'])).toThrow(
			'may only be specified once'
		);
		expect(() => parseOgCommand(['site', '--frame', '0'])).toThrow('1 to 1000');
		expect(() => parseOgCommand(['site', '--darken', '101'])).toThrow('0 to 100');
		expect(() => parseOgCommand(['site', '--wat'])).toThrow('Unknown option');
		expect(() => parseOgCommand(['site', 'textmodemata'])).toThrow('Unexpected argument');
		expect(() => parseOgCommand(['unknown'])).toThrow('Unknown OG command');
		expect(() => parseOgCommand(['site', '--darken=a', '--darken=b'])).toThrow('may only be specified once');
	});
});
