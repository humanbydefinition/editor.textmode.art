import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { publishGallerySocialPages } from './gallery-og/shared';

const root = path.resolve(import.meta.dirname, '..');

export async function buildGallerySocialPages(rootDirectory = root): Promise<number> {
	return publishGallerySocialPages(rootDirectory);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	buildGallerySocialPages()
		.then((count) => {
			console.log(`Published social metadata for ${count} gallery sketch${count === 1 ? '' : 'es'}.`);
		})
		.catch((error) => {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		});
}
