import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { validateGallerySketchMeta, type GallerySketchMeta } from '../../src/features/gallery-sketches/model/metadata';

export interface GalleryEntry {
	directory: string;
	metaPath: string;
	sketchPath: string;
	ogPath: string;
	meta: GallerySketchMeta;
}

export async function readGalleryEntries(projectRoot: string): Promise<GalleryEntry[]> {
	const sketchesDirectory = path.resolve(projectRoot, 'sketches');
	const directoryEntries = await readdir(sketchesDirectory, { withFileTypes: true });
	const entries: GalleryEntry[] = [];

	for (const directoryEntry of directoryEntries) {
		if (!directoryEntry.isDirectory()) continue;

		const directory = path.join(sketchesDirectory, directoryEntry.name);
		const metaPath = path.join(directory, 'meta.json');
		const sketchPath = path.join(directory, 'sketch.js');
		const ogPath = path.join(directory, 'og.png');
		let rawMeta: unknown;

		try {
			rawMeta = JSON.parse(await readFile(metaPath, 'utf8')) as unknown;
		} catch (error) {
			throw new Error(`Could not read valid gallery metadata JSON: ${metaPath}`, { cause: error });
		}

		const validation = validateGallerySketchMeta(rawMeta);
		if (!validation.valid) {
			throw new Error(`${metaPath}: ${validation.reason}`);
		}
		if (validation.metadata.slug !== directoryEntry.name) {
			throw new Error(
				`${metaPath} declares slug "${validation.metadata.slug}" but its folder is "${directoryEntry.name}".`
			);
		}

		await readFile(sketchPath, 'utf8');
		entries.push({
			directory,
			metaPath,
			sketchPath,
			ogPath,
			meta: validation.metadata,
		});
	}

	return entries.sort((left, right) => left.meta.slug.localeCompare(right.meta.slug));
}
