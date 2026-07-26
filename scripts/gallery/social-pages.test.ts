import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GallerySketchMeta } from '../../src/features/gallery-sketches/model/metadata';
import { publishGallerySocialPages } from './social-pages';

const temporaryDirectories: string[] = [];
const baselineImage = path.resolve(import.meta.dirname, '../..', 'public', 'og.png');
const validMeta: GallerySketchMeta = {
	slug: 'signal-bloom',
	title: 'Signal & <Bloom>',
	description: 'A "bright" gallery sketch.',
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

describe('gallery social pages', () => {
	it('publishes validated images and stable, escaped social metadata', async () => {
		const root = await createTemporaryProject(validMeta);

		await expect(publishGallerySocialPages(root)).resolves.toBe(1);
		const routeHtml = await readFile(path.join(root, 'dist', 's', validMeta.slug, 'index.html'), 'utf8');
		expect(routeHtml).toContain('<title>Signal &amp; &lt;Bloom&gt; | editor.textmode.art</title>');
		expect(routeHtml).toContain(`https://editor.textmode.art/s/${validMeta.slug}/`);
		expect(routeHtml).toContain(`https://editor.textmode.art/og/${validMeta.slug}.png`);
		expect(routeHtml).toContain('summary_large_image');
		expect(routeHtml).not.toContain('https://editor.textmode.art/og.png');
		expect(routeHtml.match(/property="og:image"/g)).toHaveLength(1);
		expect(routeHtml.match(/name="twitter:image"/g)).toHaveLength(1);
		expect(routeHtml).not.toContain('<title>Root</title>');
		await expect(readFile(path.join(root, 'dist', 'og', `${validMeta.slug}.png`))).resolves.toBeDefined();
	});

	it('uses the anonymous fallback and requires a complete base HTML document', async () => {
		const root = await createTemporaryProject({
			...validMeta,
			description: null,
			authorName: null,
		});
		await expect(publishGallerySocialPages(root)).resolves.toBe(1);
		const routeHtml = await readFile(path.join(root, 'dist', 's', validMeta.slug, 'index.html'), 'utf8');
		expect(routeHtml).toContain('A textmode.js gallery sketch by an anonymous contributor.');
		expect(routeHtml).toContain('Signal &amp; &lt;Bloom&gt; by an anonymous contributor');

		await writeFile(path.join(root, 'dist', 'index.html'), '<html><body></body></html>', 'utf8');

		await expect(publishGallerySocialPages(root)).rejects.toThrow('missing </head>');
	});

	it('validates the general source and built images even for an empty gallery', async () => {
		const root = await createTemporaryDirectory();
		await Promise.all([
			mkdir(path.join(root, 'sketches'), { recursive: true }),
			mkdir(path.join(root, 'public'), { recursive: true }),
			mkdir(path.join(root, 'dist'), { recursive: true }),
		]);
		await writeFile(path.join(root, 'public', 'og.png'), Buffer.from('invalid'));
		await copyFile(baselineImage, path.join(root, 'dist', 'og.png'));

		await expect(publishGallerySocialPages(root)).rejects.toThrow('not a valid PNG');
	});
});

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'gallery-social-test-'));
	temporaryDirectories.push(directory);
	return directory;
}

async function createTemporaryProject(meta: GallerySketchMeta): Promise<string> {
	const root = await createTemporaryDirectory();
	const sketchDirectory = path.join(root, 'sketches', meta.slug);
	await Promise.all([
		mkdir(sketchDirectory, { recursive: true }),
		mkdir(path.join(root, 'public'), { recursive: true }),
		mkdir(path.join(root, 'dist'), { recursive: true }),
	]);
	await writeFile(path.join(sketchDirectory, 'meta.json'), JSON.stringify(meta), 'utf8');
	await writeFile(path.join(sketchDirectory, 'sketch.js'), 't.draw(() => {});', 'utf8');
	await Promise.all([
		copyFile(baselineImage, path.join(sketchDirectory, 'og.png')),
		copyFile(baselineImage, path.join(root, 'public', 'og.png')),
		copyFile(baselineImage, path.join(root, 'dist', 'og.png')),
	]);
	await writeFile(
		path.join(root, 'dist', 'index.html'),
		'<html><head><title>Root</title><meta name="description" content="root"><meta property="og:title" content="root"></head><body></body></html>',
		'utf8'
	);
	return root;
}
