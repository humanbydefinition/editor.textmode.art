import { copyFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
	DEFAULT_GALLERY_OG_DARKEN,
	DEFAULT_GALLERY_OG_FRAME,
} from '../../../src/features/gallery-sketches/model/metadata';
import { readGalleryEntries } from '../../gallery/project';
import { SITE_OG_CONFIG } from '../config';
import type { OgJob } from '../contracts';
import { generateOgImages } from '../generator';

const root = path.resolve(import.meta.dirname, '../../..');
const fixtures = path.join(import.meta.dirname, 'fixtures');

test('regenerates every committed OG image with zero pixel differences', async ({ browserName }, testInfo) => {
	expect(browserName).toBe('chromium');
	const entries = await readGalleryEntries(root);
	const siteEntry = entries.find((entry) => entry.meta.slug === SITE_OG_CONFIG.sketch);
	expect(siteEntry, `Missing configured site sketch "${SITE_OG_CONFIG.sketch}".`).toBeDefined();

	const siteOutput = testInfo.outputPath('site.png');
	const galleryOutputs = new Map(
		entries.map((entry) => [entry.meta.slug, testInfo.outputPath('gallery', `${entry.meta.slug}.png`)])
	);
	const jobs: OgJob[] = [
		{
			slug: siteEntry!.meta.slug,
			codePath: siteEntry!.sketchPath,
			frame: SITE_OG_CONFIG.frame,
			darken: SITE_OG_CONFIG.darken,
			outputPath: siteOutput,
			card: { kind: 'site' },
		},
		...entries.map((entry): OgJob => ({
			slug: entry.meta.slug,
			codePath: entry.sketchPath,
			frame: entry.meta.ogFrame ?? DEFAULT_GALLERY_OG_FRAME,
			darken: entry.meta.ogDarken ?? DEFAULT_GALLERY_OG_DARKEN,
			outputPath: galleryOutputs.get(entry.meta.slug)!,
			card: {
				kind: 'gallery',
				title: entry.meta.title,
				description: entry.meta.description,
				authorName: entry.meta.authorName,
			},
		})),
	];

	const results = await generateOgImages(jobs, { projectRoot: root });

	expect(results).toHaveLength(jobs.length);
	expect(await readFile(siteOutput)).toMatchSnapshot(['public', 'og.png']);
	for (const entry of entries) {
		expect(await readFile(galleryOutputs.get(entry.meta.slug)!)).toMatchSnapshot([
			'sketches',
			entry.meta.slug,
			'og.png',
		]);
	}
});

test('renders isolated multi-job frames, layouts, and long metadata', async ({ browserName }, testInfo) => {
	expect(browserName).toBe('chromium');
	const codePath = path.join(fixtures, 'deterministic-sketch.js');
	const firstFrameOutput = testInfo.outputPath('fixture-frame-1.png');
	const laterFrameOutput = testInfo.outputPath('fixture-frame-60.png');
	const siteOutput = testInfo.outputPath('fixture-site.png');
	const longMetadataOutput = testInfo.outputPath('fixture-long-metadata.png');
	const anonymousOutput = testInfo.outputPath('fixture-anonymous.png');
	const longDescription =
		'A deterministic capture fixture with enough descriptive detail to verify that the Open Graph metadata column wraps cleanly without spanning the entire image.';
	const galleryCard = {
		kind: 'gallery' as const,
		title: 'Frame & Seek <Characterization>',
		description: longDescription,
		authorName: 'Test Runner',
	};

	const results = await generateOgImages(
		[
			{
				slug: 'frame-seek',
				codePath,
				frame: 1,
				darken: 55,
				outputPath: firstFrameOutput,
				card: galleryCard,
			},
			{
				slug: 'frame-seek',
				codePath,
				frame: 60,
				darken: 55,
				outputPath: laterFrameOutput,
				card: galleryCard,
			},
			{
				slug: 'frame-seek',
				codePath,
				frame: 60,
				darken: SITE_OG_CONFIG.darken,
				outputPath: siteOutput,
				card: { kind: 'site' },
			},
			{
				slug: 'frame-seek-long-metadata',
				codePath,
				frame: 1,
				darken: 100,
				outputPath: longMetadataOutput,
				card: {
					kind: 'gallery',
					title: 'Title '.repeat(20).trim(),
					description: 'Description '.repeat(25).trim(),
					authorName: 'Author '.repeat(11).trim(),
				},
			},
			{
				slug: 'frame-seek-anonymous',
				codePath,
				frame: 1,
				darken: 0,
				outputPath: anonymousOutput,
				card: {
					kind: 'gallery',
					title: 'Anonymous & <Escaped>',
					description: null,
					authorName: null,
				},
			},
		],
		{ projectRoot: root }
	);

	expect(results.map((result) => result.frame)).toEqual([1, 60, 60, 1, 1]);
	expect(results[1]?.seconds).toBeCloseTo(59 / 60, 3);
	expect(results[1]?.descriptionLines).toBeGreaterThanOrEqual(2);
	expect(results[2]?.kind).toBe('site');
	expect(results[3]?.descriptionLines).toBeGreaterThan(0);
	expect(results[4]?.descriptionLines).toBe(0);

	const [firstFrame, laterFrame, site] = await Promise.all([
		readFile(firstFrameOutput),
		readFile(laterFrameOutput),
		readFile(siteOutput),
	]);
	expect(firstFrame.equals(laterFrame)).toBe(false);
	expect(laterFrame.equals(site)).toBe(false);
});

test('reports the failing stage and preserves the previous valid output', async ({ browserName }, testInfo) => {
	expect(browserName).toBe('chromium');
	const outputPath = testInfo.outputPath('preserved.png');
	await copyFile(path.join(root, 'public', 'og.png'), outputPath);
	const before = await readFile(outputPath);

	await expect(
		generateOgImages(
			[
				{
					slug: 'failing-sketch',
					codePath: path.join(fixtures, 'failing-sketch.js'),
					frame: 60,
					darken: 40,
					outputPath,
					card: { kind: 'site' },
				},
			],
			{ projectRoot: root }
		)
	).rejects.toThrow(/failing-sketch.*during render.*expected OG fixture failure/);

	expect((await readFile(outputPath)).equals(before)).toBe(true);
	expect((await readdir(path.dirname(outputPath))).some((name) => name.endsWith('.tmp.png'))).toBe(false);
});
