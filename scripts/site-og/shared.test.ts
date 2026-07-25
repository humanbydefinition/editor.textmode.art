import { describe, expect, it } from 'vitest';
import type { GalleryOgEntry, GallerySketchMeta } from '../gallery-og/shared';
import {
	hasSiteOgOverrides,
	parseSiteOgArguments,
	resolveSiteOgSelection,
	selectSiteOgEntry,
	type SiteOgConfig,
} from './shared';

const config: SiteOgConfig = {
	sketch: 'textmodemata',
	frame: 60,
	output: 'public/og.png',
};

describe('site OG arguments and selection', () => {
	it('parses help and independent sketch and frame overrides', () => {
		expect(parseSiteOgArguments([])).toEqual({
			help: false,
			sketch: undefined,
			frame: undefined,
		});
		expect(parseSiteOgArguments(['--help']).help).toBe(true);
		expect(parseSiteOgArguments(['--sketch', 'textmodeshift'])).toMatchObject({
			sketch: 'textmodeshift',
		});
		expect(parseSiteOgArguments(['--sketch=textmodeshift', '--frame=120'])).toEqual({
			help: false,
			sketch: 'textmodeshift',
			frame: 120,
		});
	});

	it('rejects invalid, duplicate, unknown, and positional arguments', () => {
		expect(() => parseSiteOgArguments(['--sketch'])).toThrow('requires a value');
		expect(() => parseSiteOgArguments(['--sketch', 'Textmode_Mata'])).toThrow('--sketch is invalid');
		expect(() => parseSiteOgArguments(['--sketch=a-sketch', '--sketch=b-sketch'])).toThrow(
			'may only be specified once'
		);
		expect(() => parseSiteOgArguments(['--frame', '0'])).toThrow('1 to 1000');
		expect(() => parseSiteOgArguments(['--frame=1.5'])).toThrow('integer');
		expect(() => parseSiteOgArguments(['--wat'])).toThrow('Unknown option');
		expect(() => parseSiteOgArguments(['textmodemata'])).toThrow('Unexpected argument');
	});

	it('resolves defaults and independent overrides without changing the output', () => {
		expect(resolveSiteOgSelection(parseSiteOgArguments([]), config)).toEqual(config);
		expect(resolveSiteOgSelection(parseSiteOgArguments(['--sketch', 'textmodeshift']), config)).toEqual({
			sketch: 'textmodeshift',
			frame: 60,
			output: 'public/og.png',
		});
		expect(resolveSiteOgSelection(parseSiteOgArguments(['--frame', '240']), config)).toEqual({
			sketch: 'textmodemata',
			frame: 240,
			output: 'public/og.png',
		});
	});

	it('detects non-default selections', () => {
		expect(hasSiteOgOverrides(config, config)).toBe(false);
		expect(hasSiteOgOverrides({ ...config, frame: 120 }, config)).toBe(true);
		expect(hasSiteOgOverrides({ ...config, sketch: 'textmodeshift' }, config)).toBe(true);
	});

	it('selects only a catalogued gallery sketch', () => {
		const entry = createEntry('textmodemata');
		expect(selectSiteOgEntry([entry], 'textmodemata')).toBe(entry);
		expect(() => selectSiteOgEntry([entry], 'missing-sketch')).toThrow('Gallery sketch not found: missing-sketch');
	});
});

function createEntry(slug: string): GalleryOgEntry {
	const meta: GallerySketchMeta = {
		slug,
		title: 'Textmode Mata',
		description: null,
		authorName: null,
		license: null,
		socialLinks: null,
		createdAt: '2026-07-20T00:00:00.000Z',
	};
	return {
		directory: `/sketches/${slug}`,
		metaPath: `/sketches/${slug}/meta.json`,
		sketchPath: `/sketches/${slug}/sketch.js`,
		ogPath: `/sketches/${slug}/og.png`,
		meta,
	};
}
