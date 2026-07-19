import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	DEFAULT_OG_FRAME,
	escapeXml,
	formatOgAuthor,
	getFittedFontSize,
	getOgFrame,
	parseGenerateOgArguments,
	publishGallerySocialPages,
	readGalleryOgEntries,
	renderGallerySocialHtml,
	validateGalleryOgMeta,
	validatePng,
	type GalleryOgMeta,
} from '../scripts/gallery-og/shared';

const temporaryDirectories: string[] = [];
const validMeta: GalleryOgMeta = {
	slug: 'signal-bloom',
	title: 'Signal & <Bloom>',
	description: 'A "bright" gallery sketch.',
	authorName: 'Test Artist',
	license: 'MIT',
	socialLinks: null,
	createdAt: '2026-05-16T00:00:00.000Z',
};

afterEach(async () => {
	const { rm } = await import('node:fs/promises');
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
	);
});

describe('gallery OG arguments and metadata', () => {
	it('parses a slug, frame override, all mode, and help', () => {
		expect(parseGenerateOgArguments(['signal-bloom'])).toEqual({
			help: false,
			all: false,
			slug: 'signal-bloom',
			frame: undefined,
		});
		expect(parseGenerateOgArguments(['signal-bloom', '--frame', '120']).frame).toBe(120);
		expect(parseGenerateOgArguments(['--all'])).toEqual({
			help: false,
			all: true,
			slug: undefined,
			frame: undefined,
		});
		expect(parseGenerateOgArguments(['--help']).help).toBe(true);
	});

	it('rejects conflicting, unknown, and invalid arguments', () => {
		expect(() => parseGenerateOgArguments([])).toThrow('Provide a sketch slug');
		expect(() => parseGenerateOgArguments(['signal-bloom', '--all'])).toThrow('either a sketch slug or --all');
		expect(() => parseGenerateOgArguments(['--all', '--frame', '10'])).toThrow('--frame cannot be combined');
		expect(() => parseGenerateOgArguments(['signal-bloom', '--frame', '1.5'])).toThrow('integer');
		expect(() => parseGenerateOgArguments(['signal-bloom', '--frame', '1001'])).toThrow('1 to 1000');
		expect(() => parseGenerateOgArguments(['signal-bloom', '--wat'])).toThrow('Unknown option');
	});

	it('defaults ogFrame to 60 and validates configured bounds', () => {
		expect(getOgFrame(validMeta)).toBe(DEFAULT_OG_FRAME);
		expect(getOgFrame({ ...validMeta, ogFrame: 240 })).toBe(240);
		expect(() => validateGalleryOgMeta({ ...validMeta, ogFrame: 0 })).toThrow('1 to 1000');
		expect(() => validateGalleryOgMeta({ ...validMeta, ogFrame: 2.5 })).toThrow('integer');
	});

	it('shrinks long overlay metadata without going below its minimum size', () => {
		expect(getFittedFontSize(1800, 1104, 76, 40)).toBe(46);
		expect(getFittedFontSize(4000, 720, 28, 18)).toBe(18);
	});

	it('escapes SVG labels and falls back to an anonymous author', () => {
		expect(escapeXml(`A & <B> "C" 'D'`)).toBe('A &amp; &lt;B&gt; &quot;C&quot; &apos;D&apos;');
		expect(formatOgAuthor(null)).toBe('BY ANONYMOUS');
		expect(formatOgAuthor('')).toBe('BY ANONYMOUS');
		expect(formatOgAuthor('Ada')).toBe('BY Ada');
	});

	it('rejects gallery folders with missing required files', async () => {
		const root = await createTemporaryDirectory();
		const sketchDirectory = path.join(root, 'sketches', validMeta.slug);
		await mkdir(sketchDirectory, { recursive: true });
		await writeFile(path.join(sketchDirectory, 'meta.json'), JSON.stringify(validMeta), 'utf8');
		await expect(readGalleryOgEntries(root)).rejects.toThrow('sketch.js');
	});
});

describe('gallery OG assets and social pages', () => {
	it('validates PNG signature and dimensions', async () => {
		const directory = await createTemporaryDirectory();
		const validPath = path.join(directory, 'valid.png');
		const wrongSizePath = path.join(directory, 'wrong.png');
		const corruptPath = path.join(directory, 'corrupt.png');
		await writePngHeader(validPath, 1200, 630);
		await writePngHeader(wrongSizePath, 600, 315);
		await writeFile(corruptPath, Buffer.from('not a png'));

		await expect(validatePng(validPath)).resolves.toEqual({ width: 1200, height: 630 });
		await expect(validatePng(wrongSizePath)).rejects.toThrow('must be 1200x630');
		await expect(validatePng(corruptPath)).rejects.toThrow('not a valid PNG');
		await expect(validatePng(path.join(directory, 'missing.png'))).rejects.toThrow('Missing gallery OG image');
	});

	it('escapes metadata and emits stable gallery social tags', () => {
		const html = renderGallerySocialHtml(
			'<html><head><title>Root</title><meta name="description" content="root"><meta property="og:title" content="root"></head><body></body></html>',
			validMeta
		);

		expect(html).toContain('<title>Signal &amp; &lt;Bloom&gt; | editor.textmode.art</title>');
		expect(html).toContain('https://editor.textmode.art/s/signal-bloom/');
		expect(html).toContain('https://editor.textmode.art/og/signal-bloom.png');
		expect(html).toContain('summary_large_image');
		expect(html).not.toContain('<title>Root</title>');
	});

	it('publishes validated images and per-sketch HTML', async () => {
		const root = await createTemporaryDirectory();
		const sketchDirectory = path.join(root, 'sketches', validMeta.slug);
		await mkdir(sketchDirectory, { recursive: true });
		await mkdir(path.join(root, 'dist'), { recursive: true });
		await writeFile(path.join(sketchDirectory, 'meta.json'), JSON.stringify(validMeta), 'utf8');
		await writeFile(path.join(sketchDirectory, 'sketch.js'), 't.draw(() => {});', 'utf8');
		await writePngHeader(path.join(sketchDirectory, 'og.png'), 1200, 630);
		await writeFile(
			path.join(root, 'dist', 'index.html'),
			'<html><head><title>Root</title></head><body></body></html>'
		);

		await expect(publishGallerySocialPages(root)).resolves.toBe(1);
		await expect(readFile(path.join(root, 'dist', 'og', 'signal-bloom.png'))).resolves.toBeDefined();
		const routeHtml = await readFile(path.join(root, 'dist', 's', 'signal-bloom', 'index.html'), 'utf8');
		expect(routeHtml).toContain('summary_large_image');
	});
});

async function createTemporaryDirectory(): Promise<string> {
	const directory = await import('node:fs/promises').then(({ mkdtemp }) =>
		mkdtemp(path.join(os.tmpdir(), 'gallery-og-test-'))
	);
	temporaryDirectories.push(directory);
	return directory;
}

async function writePngHeader(filePath: string, width: number, height: number): Promise<void> {
	const buffer = Buffer.alloc(24);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
	buffer.write('IHDR', 12, 'ascii');
	buffer.writeUInt32BE(width, 16);
	buffer.writeUInt32BE(height, 20);
	await writeFile(filePath, buffer);
}
