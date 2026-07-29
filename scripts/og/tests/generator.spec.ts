import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { generateOgImages, type OgImageJob } from '@textmode/og';
import {
	DEFAULT_GALLERY_OG_DARKEN,
	DEFAULT_GALLERY_OG_FRAME,
} from '../../../src/features/gallery-sketches/model/metadata';
import { readGalleryEntries } from '../../gallery/project';
import { SITE_OG_CONFIG } from '../config';

const root = path.resolve(import.meta.dirname, '../../..');
const GPU_SNAPSHOT_TOLERANCE = { maxDiffPixelRatio: 0.06, threshold: 0.2 };
const SITE_SNAPSHOT_TOLERANCE = { ...GPU_SNAPSHOT_TOLERANCE, threshold: 0.05 };

test('regenerates every committed OG image through @textmode/og', async ({ browserName }, testInfo) => {
	expect(browserName).toBe('chromium');
	const entries = await readGalleryEntries(root);
	const siteEntry = entries.find((entry) => entry.meta.slug === SITE_OG_CONFIG.sketch);
	expect(siteEntry, `Missing configured site sketch "${SITE_OG_CONFIG.sketch}".`).toBeDefined();

	const siteOutput = testInfo.outputPath('site.png');
	const galleryOutputs = new Map(
		entries.map((entry) => [entry.meta.slug, testInfo.outputPath('gallery', `${entry.meta.slug}.png`)])
	);
	const jobs: OgImageJob[] = [
		{
			id: siteEntry!.meta.slug,
			source: { kind: 'file', path: siteEntry!.sketchPath },
			frame: SITE_OG_CONFIG.frame,
			darken: SITE_OG_CONFIG.darken,
			outputPath: siteOutput,
			layout: { kind: 'main' },
		},
		...entries.map((entry): OgImageJob => ({
			id: entry.meta.slug,
			source: { kind: 'file', path: entry.sketchPath },
			frame: entry.meta.ogFrame ?? DEFAULT_GALLERY_OG_FRAME,
			darken: entry.meta.ogDarken ?? DEFAULT_GALLERY_OG_DARKEN,
			outputPath: galleryOutputs.get(entry.meta.slug)!,
			layout: {
				kind: 'gallery',
				title: entry.meta.title,
				description: entry.meta.description,
				authorName: entry.meta.authorName,
			},
		})),
	];

	const results = await generateOgImages({ jobs });

	expect(results).toHaveLength(jobs.length);
	expect(await readFile(siteOutput)).toMatchSnapshot(['public', 'og.png'], SITE_SNAPSHOT_TOLERANCE);
	for (const entry of entries) {
		expect(await readFile(galleryOutputs.get(entry.meta.slug)!)).toMatchSnapshot(
			['sketches', entry.meta.slug, 'og.png'],
			GPU_SNAPSHOT_TOLERANCE
		);
	}
});
