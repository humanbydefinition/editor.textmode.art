import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GallerySketchMeta } from '../../src/features/gallery-sketches/model/metadata';
import { readGalleryEntries } from './project';

const temporaryDirectories: string[] = [];
const validMeta: GallerySketchMeta = {
	slug: 'signal-bloom',
	title: 'Signal Bloom',
	description: 'A gallery sketch.',
	authorName: 'Test Artist',
	license: 'MIT',
	socialLinks: null,
	createdAt: '2026-05-16T00:00:00.000Z',
};

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
	);
});

describe('gallery project', () => {
	it('reads, validates, and sorts entries without requiring an existing OG image', async () => {
		const root = await createTemporaryDirectory();
		await writeSketch(root, { ...validMeta, slug: 'zeta-sketch' });
		await writeSketch(root, { ...validMeta, slug: 'alpha-sketch' });

		const entries = await readGalleryEntries(root);

		expect(entries.map((entry) => entry.meta.slug)).toEqual(['alpha-sketch', 'zeta-sketch']);
		expect(entries[0]?.ogPath).toBe(path.join(root, 'sketches', 'alpha-sketch', 'og.png'));
	});

	it('adds file context to metadata errors', async () => {
		const root = await createTemporaryDirectory();
		await writeSketch(root, { ...validMeta, title: '' });

		await expect(readGalleryEntries(root)).rejects.toThrow(
			`${path.join(root, 'sketches', validMeta.slug, 'meta.json')}: field "title" must not be empty.`
		);
	});

	it('rejects slug/folder mismatches and missing sketch source', async () => {
		const mismatchRoot = await createTemporaryDirectory();
		const mismatchDirectory = path.join(mismatchRoot, 'sketches', 'different-folder');
		await mkdir(mismatchDirectory, { recursive: true });
		await writeFile(path.join(mismatchDirectory, 'meta.json'), JSON.stringify(validMeta), 'utf8');
		await writeFile(path.join(mismatchDirectory, 'sketch.js'), 't.draw(() => {});', 'utf8');
		await expect(readGalleryEntries(mismatchRoot)).rejects.toThrow('but its folder is "different-folder"');

		const missingRoot = await createTemporaryDirectory();
		const missingDirectory = path.join(missingRoot, 'sketches', validMeta.slug);
		await mkdir(missingDirectory, { recursive: true });
		await writeFile(path.join(missingDirectory, 'meta.json'), JSON.stringify(validMeta), 'utf8');
		await expect(readGalleryEntries(missingRoot)).rejects.toThrow('sketch.js');
	});
});

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'gallery-project-test-'));
	temporaryDirectories.push(directory);
	return directory;
}

async function writeSketch(root: string, meta: GallerySketchMeta): Promise<void> {
	const directory = path.join(root, 'sketches', meta.slug);
	await mkdir(directory, { recursive: true });
	await writeFile(path.join(directory, 'meta.json'), JSON.stringify(meta), 'utf8');
	await writeFile(path.join(directory, 'sketch.js'), 't.draw(() => {});', 'utf8');
}
