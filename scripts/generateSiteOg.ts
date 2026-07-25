import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { captureOg } from './captureOg';
import { readGalleryOgEntries } from './gallery-og/shared';
import { SITE_OG_CONFIG } from './site-og/config';
import { hasSiteOgOverrides, parseSiteOgArguments, resolveSiteOgSelection, selectSiteOgEntry } from './site-og/shared';

const root = path.resolve(import.meta.dirname, '..');
const USAGE = `Generate the general editor Open Graph image.

Usage:
  npm run generate:og:site
  npm run generate:og:site -- --sketch <gallery-slug>
  npm run generate:og:site -- --frame <1-1000>
  npm run generate:og:site -- --sketch <gallery-slug> --frame <1-1000>
  npm run generate:og:site -- --help

The image is written to public/og.png. CLI overrides do not update the checked-in
defaults in scripts/site-og/config.ts.`;

export async function generateSiteOg(args: string[], rootDirectory = root): Promise<void> {
	const parsed = parseSiteOgArguments(args);

	if (parsed.help) {
		console.log(USAGE);
		return;
	}

	const selection = resolveSiteOgSelection(parsed, SITE_OG_CONFIG);
	const entries = await readGalleryOgEntries(rootDirectory);
	const entry = selectSiteOgEntry(entries, selection.sketch);
	const outputPath = path.resolve(rootDirectory, selection.output);

	console.log(`Rendering site OG with ${entry.meta.slug} at frame ${selection.frame}...`);
	await captureOg(entry, {
		frame: selection.frame,
		outputPath,
		rootDirectory,
		layout: {
			kind: 'site',
		},
	});
	console.log(`Generated ${outputPath}`);

	if (hasSiteOgOverrides(selection, SITE_OG_CONFIG)) {
		console.log(
			`Remember to update scripts/site-og/config.ts to sketch "${selection.sketch}" at frame ${selection.frame}.`
		);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	generateSiteOg(process.argv.slice(2)).catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		if (
			error instanceof Error &&
			(error.message.startsWith('Unknown option:') ||
				error.message.startsWith('Unexpected argument:') ||
				error.message.startsWith('--'))
		) {
			console.error(`\n${USAGE}`);
		}
		process.exitCode = 1;
	});
}
