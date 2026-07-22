import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateGalleryOg } from './generateGalleryOg';
import { validatePng, type GalleryOgEntry, type GalleryOgMeta } from './gallery-og/shared';

const root = path.resolve(import.meta.dirname, '..');
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'gallery-og-smoke-'));

try {
	const sketchDirectory = path.join(temporaryDirectory, 'frame-seek');
	await mkdir(sketchDirectory, { recursive: true });
	const meta: GalleryOgMeta = {
		slug: 'frame-seek',
		title: 'Frame & Seek <Smoke Test>',
		description:
			'A deterministic capture fixture with enough descriptive detail to verify that the Open Graph metadata column wraps cleanly without spanning the entire image.',
		authorName: 'Test Runner',
		license: null,
		socialLinks: null,
		createdAt: '2026-07-19T00:00:00.000Z',
		ogFrame: 60,
	};
	const sketchPath = path.join(sketchDirectory, 'sketch.js');
	const outputPath = path.join(sketchDirectory, 'og.png');
	await writeFile(
		sketchPath,
		`t.fontSize(16);
t.draw(() => {
  t.background(8, 10, 14);
  t.charColor(242, 242, 236);
  t.cellColor(8, 10, 14);
  t.print("FRAME " + t.frameCount + " / " + t.secs.toFixed(2) + "S", -12, 0);
});`,
		'utf8'
	);
	const entry: GalleryOgEntry = {
		directory: sketchDirectory,
		metaPath: path.join(sketchDirectory, 'meta.json'),
		sketchPath,
		ogPath: outputPath,
		meta,
	};

	const result = await generateGalleryOg(entry, { frame: 60, outputPath, rootDirectory: root });
	if (result.frame !== 60) throw new Error(`Smoke capture rendered frame ${result.frame} instead of frame 60.`);
	if (Math.abs(result.seconds - 59 / 60) > 0.25) {
		throw new Error(`Smoke capture seconds were not aligned to frame 60: ${result.seconds}.`);
	}
	if (result.descriptionLines < 2) {
		throw new Error(`Smoke capture description did not wrap (${result.descriptionLines} line).`);
	}
	await validatePng(outputPath);
	const image = await readFile(outputPath);
	if (image.length < 10_000) throw new Error(`Smoke image was unexpectedly small (${image.length} bytes).`);
	const preservedOutput = process.env.GALLERY_OG_SMOKE_OUTPUT;
	if (preservedOutput) await copyFile(outputPath, preservedOutput);
	console.log(`Gallery OG smoke capture passed (${image.length} bytes).`);
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}
