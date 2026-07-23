import { readFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import {
	getOgFrame,
	formatOgAuthor,
	OG_HEIGHT,
	OG_WIDTH,
	parseGenerateOgArguments,
	readGalleryOgEntries,
	validatePng,
	type GalleryOgEntry,
} from './gallery-og/shared';

const root = path.resolve(import.meta.dirname, '..');
const CAPTURE_TIMEOUT_MS = 30_000;
const USAGE = `Generate gallery Open Graph images.

Usage:
  npm run generate:og -- <slug>
  npm run generate:og -- <slug> --frame <1-1000>
  npm run generate:og -- --all
  npm run generate:og -- --help

The image is written to sketches/<slug>/og.png. A --frame override does not
update meta.json; persist the selected value as ogFrame before opening a PR.`;

interface CaptureOptions {
	frame: number;
	outputPath: string;
	rootDirectory?: string;
}

export interface GalleryOgCaptureResult {
	frame: number;
	seconds: number;
	descriptionLines: number;
}

export async function generateGalleryOg(
	entry: GalleryOgEntry,
	options: CaptureOptions
): Promise<GalleryOgCaptureResult> {
	const projectRoot = options.rootDirectory ?? root;
	const temporaryOutput = `${options.outputPath}.${randomUUID()}.tmp`;
	let server: ViteDevServer | undefined;
	let browser: Browser | undefined;

	try {
		const code = await readFile(entry.sketchPath, 'utf8');
		server = await startPreviewServer(projectRoot);
		browser = await launchChromium();
		const page = await browser.newPage({
			viewport: { width: OG_WIDTH, height: OG_HEIGHT },
			deviceScaleFactor: 1,
		});
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => pageErrors.push(error.message));

		await page.goto(getPreviewUrl(server), { waitUntil: 'domcontentloaded', timeout: CAPTURE_TIMEOUT_MS });
		await page.waitForFunction(() => typeof window.renderGalleryOg === 'function', undefined, {
			timeout: CAPTURE_TIMEOUT_MS,
		});

		let result: GalleryOgCaptureResult;
		try {
			result = await page.evaluate((request) => window.renderGalleryOg(request), {
				code,
				frame: options.frame,
				title: entry.meta.title,
				description: entry.meta.description,
				authorName: entry.meta.authorName,
			});
		} catch (error) {
			const status = await page.locator('body').getAttribute('data-status');
			const previewError = await page.locator('body').getAttribute('data-error');
			const details =
				previewError ?? pageErrors.at(-1) ?? (error instanceof Error ? error.message : String(error));
			throw new Error(`Preview failed for "${entry.meta.slug}" (${status ?? 'unknown'}): ${details}`, {
				cause: error,
			});
		}

		if (result.frame !== options.frame) {
			throw new Error(`Preview rendered frame ${result.frame}; expected ${options.frame}.`);
		}
		if ((await page.locator('body').getAttribute('data-status')) !== 'ready') {
			throw new Error(`Preview did not reach ready state for "${entry.meta.slug}".`);
		}
		await page.locator('#gallery-og-overlay').waitFor({ state: 'visible', timeout: CAPTURE_TIMEOUT_MS });
		const overlayText = (await page.locator('#gallery-og-overlay').textContent()) ?? '';
		const expectedAuthor = formatOgAuthor(entry.meta.authorName);
		const hasExpectedDescription =
			entry.meta.description === null ||
			removeWhitespace(overlayText).includes(removeWhitespace(entry.meta.description.trim()));
		if (
			!overlayText.includes(entry.meta.title) ||
			!hasExpectedDescription ||
			!overlayText.includes(expectedAuthor)
		) {
			throw new Error(`Preview overlay is missing expected metadata for "${entry.meta.slug}".`);
		}
		await page.screenshot({
			path: temporaryOutput,
			clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT },
			animations: 'disabled',
			type: 'png',
		});
		await validatePng(temporaryOutput);
		await rename(temporaryOutput, options.outputPath);
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Could not generate OG image for "${entry.meta.slug}": ${message}`, { cause: error });
	} finally {
		await Promise.allSettled([browser?.close(), server?.close()]);
		await rm(temporaryOutput, { force: true });
	}
}

function removeWhitespace(value: string): string {
	return value.replace(/\s/g, '');
}

async function startPreviewServer(projectRoot: string): Promise<ViteDevServer> {
	const server = await createServer({
		configFile: false,
		root: projectRoot,
		appType: 'mpa',
		logLevel: 'error',
		optimizeDeps: {
			entries: ['scripts/gallery-og/preview.html'],
		},
		server: {
			host: '127.0.0.1',
			port: 0,
			strictPort: false,
		},
	});
	await server.listen();
	return server;
}

function getPreviewUrl(server: ViteDevServer): string {
	const address = server.httpServer?.address();
	if (!address || typeof address === 'string') throw new Error('Could not determine the local preview server port.');
	return `http://127.0.0.1:${address.port}/scripts/gallery-og/preview.html`;
}

async function launchChromium(): Promise<Browser> {
	const args = [
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--disable-dev-shm-usage',
		'--enable-webgl',
		'--ignore-gpu-blocklist',
		'--use-gl=angle',
		'--use-angle=swiftshader-webgl',
		'--enable-unsafe-swiftshader',
	];

	try {
		return await chromium.launch({ headless: true, channel: 'chromium', args });
	} catch {
		try {
			return await chromium.launch({ headless: true, args });
		} catch (fallbackError) {
			const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
			if (message.includes("Executable doesn't exist") || message.includes('playwright install')) {
				throw new Error(
					'Playwright Chromium is not installed. Run `npm run playwright:install` once, then retry.',
					{
						cause: fallbackError,
					}
				);
			}
			throw new Error('Could not launch Chromium for gallery OG capture.', {
				cause: fallbackError,
			});
		}
	}
}

async function main(): Promise<void> {
	let parsed;
	try {
		parsed = parseGenerateOgArguments(process.argv.slice(2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		console.error(`\n${USAGE}`);
		process.exitCode = 1;
		return;
	}

	if (parsed.help) {
		console.log(USAGE);
		return;
	}

	const entries = await readGalleryOgEntries(root);
	const selectedEntries = parsed.all ? entries : entries.filter((entry) => entry.meta.slug === parsed.slug);
	if (selectedEntries.length === 0) {
		throw new Error(parsed.all ? 'No gallery sketches were found.' : `Gallery sketch not found: ${parsed.slug}`);
	}

	for (const [index, entry] of selectedEntries.entries()) {
		const frame = parsed.frame ?? getOgFrame(entry.meta);
		console.log(`Rendering ${entry.meta.slug} at frame ${frame} (${index + 1}/${selectedEntries.length})...`);
		await generateGalleryOg(entry, { frame, outputPath: entry.ogPath });
		console.log(`Generated ${entry.ogPath}`);
		if (parsed.frame !== undefined && entry.meta.ogFrame !== parsed.frame) {
			console.log(`Remember to set "ogFrame": ${parsed.frame} in ${entry.metaPath}.`);
		}
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
