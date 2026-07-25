import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { captureOg } from './captureOg';
import { generateGalleryOg } from './generateGalleryOg';
import { validateOgPng, type GalleryOgEntry, type GallerySketchMeta } from './gallery-og/shared';

const root = path.resolve(import.meta.dirname, '..');
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'gallery-og-smoke-'));

try {
	const sketchDirectory = path.join(temporaryDirectory, 'frame-seek');
	await mkdir(sketchDirectory, { recursive: true });
	const meta: GallerySketchMeta = {
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
	const firstFrameOutputPath = path.join(sketchDirectory, 'og-frame-1.png');
	const siteOutputPath = path.join(sketchDirectory, 'site-og.png');
	await writeFile(
		sketchPath,
		`let drawCount = 0;
t.fontSize(16);
t.draw(() => {
  drawCount += 1;
  t.background(drawCount % 256, 10, 14);
  t.charColor(242, 242, 236);
  t.cellColor(drawCount % 256, 10, 14);
  t.print("DRAW " + drawCount, -4, 0);
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

	await generateGalleryOg(entry, { frame: 1, outputPath: firstFrameOutputPath, rootDirectory: root });
	const result = await generateGalleryOg(entry, { frame: 60, outputPath, rootDirectory: root });
	if (result.frame !== 60) throw new Error(`Smoke capture rendered frame ${result.frame} instead of frame 60.`);
	if (Math.abs(result.seconds - 59 / 60) > 0.25) {
		throw new Error(`Smoke capture seconds were not aligned to frame 60: ${result.seconds}.`);
	}
	if (result.descriptionLines < 2) {
		throw new Error(`Smoke capture description did not wrap (${result.descriptionLines} line).`);
	}
	await validateOgPng(outputPath);
	const [firstFrameImage, image] = await Promise.all([readFile(firstFrameOutputPath), readFile(outputPath)]);
	if (firstFrameImage.equals(image)) {
		throw new Error('Smoke capture did not advance stateful draw callbacks to the requested frame.');
	}
	if (image.length < 10_000) throw new Error(`Smoke image was unexpectedly small (${image.length} bytes).`);

	const siteResult = await captureOg(entry, {
		frame: 60,
		outputPath: siteOutputPath,
		rootDirectory: root,
		layout: {
			kind: 'site',
		},
	});
	if (siteResult.layout !== 'site') throw new Error(`Smoke capture returned ${siteResult.layout} layout.`);
	await validateOgPng(siteOutputPath);
	const siteImageBeforeFailure = await readFile(siteOutputPath);
	if (siteImageBeforeFailure.equals(image)) {
		throw new Error('Site and gallery layouts produced identical images.');
	}

	const failingSketchPath = path.join(sketchDirectory, 'failing-sketch.js');
	await writeFile(failingSketchPath, 'throw new Error("expected smoke failure");', 'utf8');
	let failedAsExpected = false;
	try {
		await captureOg(
			{ ...entry, sketchPath: failingSketchPath },
			{
				frame: 60,
				outputPath: siteOutputPath,
				rootDirectory: root,
				layout: {
					kind: 'site',
				},
			}
		);
	} catch (error) {
		failedAsExpected = error instanceof Error && error.message.includes('expected smoke failure');
	}
	if (!failedAsExpected) throw new Error('Smoke capture did not report the expected failing sketch.');
	const siteImageAfterFailure = await readFile(siteOutputPath);
	if (!siteImageAfterFailure.equals(siteImageBeforeFailure)) {
		throw new Error('Failed site capture replaced the previous valid image.');
	}

	const preservedOutput = process.env.GALLERY_OG_SMOKE_OUTPUT;
	if (preservedOutput) await copyFile(outputPath, preservedOutput);
	console.log(
		`OG smoke capture passed (gallery ${image.length} bytes, site ${siteImageBeforeFailure.length} bytes).`
	);
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}
