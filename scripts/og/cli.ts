import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { generateOgImages, type OgImageJob } from '@textmode/og';
import {
	DEFAULT_GALLERY_OG_DARKEN,
	DEFAULT_GALLERY_OG_FRAME,
	MAX_GALLERY_OG_DARKEN,
	MAX_GALLERY_OG_FRAME,
	MIN_GALLERY_OG_DARKEN,
	MIN_GALLERY_OG_FRAME,
	validateSlug,
} from '../../src/features/gallery-sketches/model/metadata';
import { readGalleryEntries, type GalleryEntry } from '../gallery/project';
import { SITE_OG_CONFIG } from './config';

const projectRoot = path.resolve(import.meta.dirname, '../..');

const GALLERY_USAGE = `Generate gallery Open Graph images.

Usage:
  npm run generate:og -- <slug>
  npm run generate:og -- <slug> --frame <1-1000>
  npm run generate:og -- <slug> --darken <0-100>
  npm run generate:og -- --all
  npm run generate:og -- --help

A --frame or --darken override does not update meta.json; persist the selected
values as ogFrame and ogDarken before opening a PR.`;

const SITE_USAGE = `Generate the general editor Open Graph image.

Usage:
  npm run generate:og:site
  npm run generate:og:site -- --sketch <gallery-slug>
  npm run generate:og:site -- --frame <1-1000>
  npm run generate:og:site -- --darken <0-100>
  npm run generate:og:site -- --sketch <gallery-slug> --frame <1-1000>
  npm run generate:og:site -- --help

The image is written to public/og.png. CLI overrides do not update the checked-in
defaults in scripts/og/config.ts.`;

type GalleryCommand = {
	kind: 'gallery';
	help: boolean;
	all: boolean;
	slug?: string;
	frame?: number;
	darken?: number;
};

type SiteCommand = {
	kind: 'site';
	help: boolean;
	sketch?: string;
	frame?: number;
	darken?: number;
};

export type OgCommand = GalleryCommand | SiteCommand;

export function parseOgCommand(args: string[]): OgCommand {
	const [command, ...commandArgs] = args;
	if (command === 'gallery') return parseGalleryCommand(commandArgs);
	if (command === 'site') return parseSiteCommand(commandArgs);
	throw new CliUsageError(command ? `Unknown OG command: ${command}` : 'Provide an OG command: gallery or site.');
}

/* v8 ignore start -- @preserve */
async function runOgCli(args: string[], root: string): Promise<void> {
	const command = parseOgCommand(args);
	if (command.help) {
		console.log(command.kind === 'gallery' ? GALLERY_USAGE : SITE_USAGE);
		return;
	}

	const entries = await readGalleryEntries(root);
	if (command.kind === 'gallery') {
		const selectedEntries = selectGalleryEntries(entries, command);
		const jobs = selectedEntries.map((entry) => createGalleryJob(entry, command.frame, command.darken));

		for (const [index, job] of jobs.entries()) {
			console.log(`Rendering ${job.id} at frame ${job.frame} (${index + 1}/${jobs.length})...`);
		}
		await generateOgImages({ jobs });
		for (const [index, entry] of selectedEntries.entries()) {
			console.log(`Generated ${entry.ogPath}`);
			if (command.frame !== undefined && entry.meta.ogFrame !== command.frame) {
				console.log(`Remember to set "ogFrame": ${command.frame} in ${entry.metaPath}.`);
			}
			if (command.darken !== undefined && entry.meta.ogDarken !== command.darken) {
				console.log(`Remember to set "ogDarken": ${command.darken} in ${entry.metaPath}.`);
			}
			if (index < selectedEntries.length - 1) console.log('');
		}
		return;
	}

	const sketch = command.sketch ?? SITE_OG_CONFIG.sketch;
	const frame = command.frame ?? SITE_OG_CONFIG.frame;
	const darken = command.darken ?? SITE_OG_CONFIG.darken;
	const entry = entries.find((candidate) => candidate.meta.slug === sketch);
	if (!entry) throw new Error(`Gallery sketch not found: ${sketch}`);
	const outputPath = path.resolve(root, SITE_OG_CONFIG.output);

	console.log(`Rendering site OG with ${entry.meta.slug} at frame ${frame}...`);
	await generateOgImages({
		jobs: [
			{
				id: entry.meta.slug,
				source: { kind: 'file', path: entry.sketchPath },
				frame,
				darken,
				outputPath,
				layout: { kind: 'main' },
			},
		],
	});
	console.log(`Generated ${outputPath}`);
	if (sketch !== SITE_OG_CONFIG.sketch || frame !== SITE_OG_CONFIG.frame || darken !== SITE_OG_CONFIG.darken) {
		console.log(
			`Remember to update scripts/og/config.ts to sketch "${sketch}" at frame ${frame} with darken ${darken}.`
		);
	}
}
/* v8 ignore stop -- @preserve */

function parseGalleryCommand(args: string[]): GalleryCommand {
	const { values, positionals, tokens } = parseCommandArgs(args, {
		help: { type: 'boolean', short: 'h' },
		all: { type: 'boolean' },
		frame: { type: 'string' },
		darken: { type: 'string' },
	});
	rejectDuplicateOption(tokens, 'frame');
	rejectDuplicateOption(tokens, 'darken');

	const help = values.help ?? false;
	const all = values.all ?? false;
	const slug = positionals[0];
	const frame = values.frame === undefined ? undefined : parseOgFrame(values.frame, '--frame');
	const darken = values.darken === undefined ? undefined : parseOgDarken(values.darken, '--darken');
	if (positionals.length > 1) throw new CliUsageError(`Unexpected extra argument: ${positionals[1]}`);
	if (help) return { kind: 'gallery', help: true, all, slug, frame, darken };
	if (all && slug) throw new CliUsageError('Use either a sketch slug or --all, not both.');
	if (all && frame !== undefined) {
		throw new CliUsageError('--frame cannot be combined with --all; set ogFrame per sketch.');
	}
	if (all && darken !== undefined) {
		throw new CliUsageError('--darken cannot be combined with --all; set ogDarken per sketch.');
	}
	if (!all && !slug) throw new CliUsageError('Provide a sketch slug or use --all.');
	if (slug) assertSlug(slug);

	return { kind: 'gallery', help: false, all, slug, frame, darken };
}

function parseSiteCommand(args: string[]): SiteCommand {
	const { values, positionals, tokens } = parseCommandArgs(args, {
		help: { type: 'boolean', short: 'h' },
		sketch: { type: 'string' },
		frame: { type: 'string' },
		darken: { type: 'string' },
	});
	rejectDuplicateOption(tokens, 'sketch');
	rejectDuplicateOption(tokens, 'frame');
	rejectDuplicateOption(tokens, 'darken');

	if (positionals.length > 0) throw new CliUsageError(`Unexpected argument: ${positionals[0]}`);
	const sketch = values.sketch;
	if (sketch !== undefined) assertSlug(sketch, '--sketch is invalid: ');

	return {
		kind: 'site',
		help: values.help ?? false,
		sketch,
		frame: values.frame === undefined ? undefined : parseOgFrame(values.frame, '--frame'),
		darken: values.darken === undefined ? undefined : parseOgDarken(values.darken, '--darken'),
	};
}

function parseCommandArgs<T extends Record<string, { type: 'boolean' | 'string'; short?: string }>>(
	args: string[],
	options: T
) {
	try {
		return parseArgs({
			args,
			options,
			allowPositionals: true,
			strict: true,
			tokens: true,
		});
	} catch (error) {
		throw new CliUsageError(error instanceof Error ? error.message : String(error), { cause: error });
	}
}

function rejectDuplicateOption(tokens: Array<{ kind: string; name?: string }>, optionName: string): void {
	const count = tokens.filter((token) => token.kind === 'option' && token.name === optionName).length;
	if (count > 1) throw new CliUsageError(`--${optionName} may only be specified once.`);
}

function parseOgFrame(value: unknown, label: string): number {
	const frame = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
	if (!Number.isInteger(frame) || frame < MIN_GALLERY_OG_FRAME || frame > MAX_GALLERY_OG_FRAME) {
		throw new CliUsageError(`${label} must be an integer from ${MIN_GALLERY_OG_FRAME} to ${MAX_GALLERY_OG_FRAME}.`);
	}
	return frame;
}

function parseOgDarken(value: unknown, label: string): number {
	const darken = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
	if (!Number.isInteger(darken) || darken < MIN_GALLERY_OG_DARKEN || darken > MAX_GALLERY_OG_DARKEN) {
		throw new CliUsageError(
			`${label} must be an integer from ${MIN_GALLERY_OG_DARKEN} to ${MAX_GALLERY_OG_DARKEN}.`
		);
	}
	return darken;
}

function assertSlug(slug: string, prefix = ''): void {
	const validation = validateSlug(slug);
	if (!validation.valid) throw new CliUsageError(`${prefix}${validation.reason}`);
}

/* v8 ignore start -- @preserve */
function selectGalleryEntries(entries: GalleryEntry[], command: GalleryCommand): GalleryEntry[] {
	const selected = command.all ? entries : entries.filter((entry) => entry.meta.slug === command.slug);
	if (selected.length === 0) {
		throw new Error(command.all ? 'No gallery sketches were found.' : `Gallery sketch not found: ${command.slug}`);
	}
	return selected;
}

function createGalleryJob(
	entry: GalleryEntry,
	frameOverride: number | undefined,
	darkenOverride: number | undefined
): OgImageJob {
	return {
		id: entry.meta.slug,
		source: { kind: 'file', path: entry.sketchPath },
		frame: frameOverride ?? entry.meta.ogFrame ?? DEFAULT_GALLERY_OG_FRAME,
		darken: darkenOverride ?? entry.meta.ogDarken ?? DEFAULT_GALLERY_OG_DARKEN,
		outputPath: entry.ogPath,
		layout: {
			kind: 'gallery',
			title: entry.meta.title,
			description: entry.meta.description,
			authorName: entry.meta.authorName,
		},
	};
}
/* v8 ignore stop -- @preserve */

class CliUsageError extends Error {}

/* v8 ignore start -- @preserve */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	runOgCli(process.argv.slice(2), projectRoot).catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		if (error instanceof CliUsageError) {
			const command = process.argv[2];
			console.error(`\n${command === 'site' ? SITE_USAGE : GALLERY_USAGE}`);
		}
		process.exitCode = 1;
	});
}
/* v8 ignore stop -- @preserve */
