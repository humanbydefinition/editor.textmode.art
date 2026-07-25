import { validateSlug } from '../../src/features/gallery-sketches/model/metadata';
import { parseOgFrame, type GalleryOgEntry } from '../gallery-og/shared';

export interface SiteOgConfig {
	sketch: string;
	frame: number;
	output: string;
}

export interface SiteOgArguments {
	help: boolean;
	sketch?: string;
	frame?: number;
}

export interface SiteOgSelection {
	sketch: string;
	frame: number;
	output: string;
}

export function parseSiteOgArguments(args: string[]): SiteOgArguments {
	let help = false;
	let sketch: string | undefined;
	let frame: number | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--help' || argument === '-h') {
			help = true;
			continue;
		}
		if (argument === '--sketch') {
			if (sketch !== undefined) throw new Error('--sketch may only be specified once.');
			const value = args[index + 1];
			if (value === undefined) throw new Error('--sketch requires a value.');
			sketch = parseSketchSlug(value);
			index += 1;
			continue;
		}
		if (argument.startsWith('--sketch=')) {
			if (sketch !== undefined) throw new Error('--sketch may only be specified once.');
			sketch = parseSketchSlug(argument.slice('--sketch='.length));
			continue;
		}
		if (argument === '--frame') {
			if (frame !== undefined) throw new Error('--frame may only be specified once.');
			const value = args[index + 1];
			if (value === undefined) throw new Error('--frame requires a value.');
			frame = parseOgFrame(value, '--frame');
			index += 1;
			continue;
		}
		if (argument.startsWith('--frame=')) {
			if (frame !== undefined) throw new Error('--frame may only be specified once.');
			frame = parseOgFrame(argument.slice('--frame='.length), '--frame');
			continue;
		}
		throw new Error(argument.startsWith('-') ? `Unknown option: ${argument}` : `Unexpected argument: ${argument}`);
	}

	return { help, sketch, frame };
}

export function resolveSiteOgSelection(arguments_: SiteOgArguments, config: SiteOgConfig): SiteOgSelection {
	return {
		sketch: arguments_.sketch ?? config.sketch,
		frame: arguments_.frame ?? parseOgFrame(config.frame, 'site OG config frame'),
		output: config.output,
	};
}

export function selectSiteOgEntry(entries: GalleryOgEntry[], slug: string): GalleryOgEntry {
	const entry = entries.find((candidate) => candidate.meta.slug === slug);
	if (!entry) throw new Error(`Gallery sketch not found: ${slug}`);
	return entry;
}

export function hasSiteOgOverrides(selection: SiteOgSelection, config: SiteOgConfig): boolean {
	return selection.sketch !== config.sketch || selection.frame !== config.frame;
}

function parseSketchSlug(value: string): string {
	const validation = validateSlug(value);
	if (!validation.valid) throw new Error(`--sketch is invalid: ${validation.reason}`);
	return value;
}
