import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { captureOg } from './captureOg';
import { getOgFrame, parseGenerateOgArguments, readGalleryOgEntries, type GalleryOgEntry } from './gallery-og/shared';

const root = path.resolve(import.meta.dirname, '..');
const USAGE = `Generate gallery Open Graph images.

Usage:
  npm run generate:og -- <slug>
  npm run generate:og -- <slug> --frame <1-1000>
  npm run generate:og -- --all
  npm run generate:og -- --help

The image is written to sketches/<slug>/og.png. A --frame override does not
update meta.json; persist the selected value as ogFrame before opening a PR.`;

interface CaptureOptions {
	frame: number;
	outputPath: string;
	rootDirectory?: string;
}

export interface GalleryOgCaptureResult {
	frame: number;
	seconds: number;
	descriptionLines: number;
	layout: 'gallery';
}

export async function generateGalleryOg(
	entry: GalleryOgEntry,
	options: CaptureOptions
): Promise<GalleryOgCaptureResult> {
	const result = await captureOg(entry, {
		frame: options.frame,
		outputPath: options.outputPath,
		rootDirectory: options.rootDirectory,
		layout: {
			kind: 'gallery',
			title: entry.meta.title,
			description: entry.meta.description,
			authorName: entry.meta.authorName,
		},
	});
	return { ...result, layout: 'gallery' };
}

async function main(): Promise<void> {
	let parsed;
	try {
		parsed = parseGenerateOgArguments(process.argv.slice(2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		console.error(`\n${USAGE}`);
		process.exitCode = 1;
		return;
	}

	if (parsed.help) {
		console.log(USAGE);
		return;
	}

	const entries = await readGalleryOgEntries(root);
	const selectedEntries = parsed.all ? entries : entries.filter((entry) => entry.meta.slug === parsed.slug);
	if (selectedEntries.length === 0) {
		throw new Error(parsed.all ? 'No gallery sketches were found.' : `Gallery sketch not found: ${parsed.slug}`);
	}

	for (const [index, entry] of selectedEntries.entries()) {
		const frame = parsed.frame ?? getOgFrame(entry.meta);
		console.log(`Rendering ${entry.meta.slug} at frame ${frame} (${index + 1}/${selectedEntries.length})...`);
		await generateGalleryOg(entry, { frame, outputPath: entry.ogPath });
		console.log(`Generated ${entry.ogPath}`);
		if (parsed.frame !== undefined && entry.meta.ogFrame !== parsed.frame) {
			console.log(`Remember to set "ogFrame": ${parsed.frame} in ${entry.metaPath}.`);
		}
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
