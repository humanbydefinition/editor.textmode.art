import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import type { GalleryOgEntry } from './gallery-og/shared';
import {
	OG_HEIGHT,
	OG_WIDTH,
	type OgCaptureResult,
	type OgLayout,
	type OgPreviewRequest,
} from './gallery-og/contracts';
import { formatOgAuthor, validateOgPng } from './gallery-og/shared';

const root = path.resolve(import.meta.dirname, '..');
const CAPTURE_TIMEOUT_MS = 30_000;

export interface CaptureOgOptions {
	frame: number;
	layout: OgLayout;
	outputPath: string;
	rootDirectory?: string;
}

export async function captureOg(entry: GalleryOgEntry, options: CaptureOgOptions): Promise<OgCaptureResult> {
	const projectRoot = options.rootDirectory ?? root;
	const temporaryOutput = `${options.outputPath}.${randomUUID()}.tmp`;
	let server: ViteDevServer | undefined;
	let browser: Browser | undefined;

	try {
		await mkdir(path.dirname(options.outputPath), { recursive: true });
		const code = await readFile(entry.sketchPath, 'utf8');
		server = await startPreviewServer(projectRoot);
		browser = await launchChromium();
		const page = await browser.newPage({
			viewport: { width: OG_WIDTH, height: OG_HEIGHT },
			deviceScaleFactor: 1,
		});
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => pageErrors.push(error.message));

		await page.goto(getPreviewUrl(server), {
			waitUntil: 'domcontentloaded',
			timeout: CAPTURE_TIMEOUT_MS,
		});
		await page.waitForFunction(() => typeof window.renderOg === 'function', undefined, {
			timeout: CAPTURE_TIMEOUT_MS,
		});

		let result: OgCaptureResult;
		try {
			const request: OgPreviewRequest = {
				code,
				frame: options.frame,
				layout: options.layout,
			};
			result = await page.evaluate((previewRequest) => window.renderOg(previewRequest), request);
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
		if (result.layout !== options.layout.kind) {
			throw new Error(`Preview rendered ${result.layout} layout; expected ${options.layout.kind}.`);
		}
		if ((await page.locator('body').getAttribute('data-status')) !== 'ready') {
			throw new Error(`Preview did not reach ready state for "${entry.meta.slug}".`);
		}

		const overlay = page.locator('#og-overlay');
		await overlay.waitFor({ state: 'visible', timeout: CAPTURE_TIMEOUT_MS });
		const overlayText = (await overlay.textContent()) ?? '';
		assertExpectedOverlayText(overlayText, options.layout, entry.meta.slug);
		if (options.layout.kind === 'site') {
			const [backdropCount, rectangleCount, backdropFill, backdropOpacity, prohibitedEffects] = await Promise.all(
				[
					overlay.locator('#site-og-backdrop').count(),
					overlay.locator('rect').count(),
					overlay.locator('#site-og-backdrop').getAttribute('fill'),
					overlay.locator('#site-og-backdrop').getAttribute('opacity'),
					overlay.locator('linearGradient, radialGradient, filter').count(),
				]
			);
			if (
				backdropCount !== 1 ||
				rectangleCount !== 1 ||
				backdropFill !== '#000' ||
				backdropOpacity !== '0.45' ||
				prohibitedEffects !== 0
			) {
				throw new Error(
					'Site OG overlay must contain exactly one black, 45%-opacity backdrop and no gradients or filters.'
				);
			}
			if (entry.meta.authorName && overlayText.includes(entry.meta.authorName)) {
				throw new Error(`Site OG overlay unexpectedly includes the gallery sketch author.`);
			}
		}

		await page.screenshot({
			path: temporaryOutput,
			clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT },
			animations: 'disabled',
			type: 'png',
		});
		await validateOgPng(temporaryOutput);
		await rename(temporaryOutput, options.outputPath);
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Could not generate ${options.layout.kind} OG image for "${entry.meta.slug}": ${message}`, {
			cause: error,
		});
	} finally {
		await Promise.allSettled([browser?.close(), server?.close()]);
		await rm(temporaryOutput, { force: true });
	}
}

function assertExpectedOverlayText(overlayText: string, layout: OgLayout, slug: string): void {
	if (layout.kind === 'gallery') {
		const hasExpectedDescription =
			layout.description === null ||
			removeWhitespace(overlayText).includes(removeWhitespace(layout.description.trim()));
		if (
			!overlayText.includes(layout.title) ||
			!hasExpectedDescription ||
			!overlayText.includes(formatOgAuthor(layout.authorName))
		) {
			throw new Error(`Preview overlay is missing expected gallery metadata for "${slug}".`);
		}
		return;
	}

	for (const expected of [
		'editor.textmode.art',
		'CREATE TEXTMODE',
		'IN YOUR BROWSER',
		'FREE + OPEN SOURCE',
		'LIVE CODE / CHARACTER GRAPHICS',
		'BROWSER-BASED / TEXTMODE.JS',
	]) {
		if (!overlayText.includes(expected)) {
			throw new Error(`Preview overlay is missing expected site label "${expected}" for "${slug}".`);
		}
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
			watch: {
				ignored: ['**/*.tmp', '**/og.png'],
			},
		},
	});
	await server.listen();
	return server;
}

function getPreviewUrl(server: ViteDevServer): string {
	const address = server.httpServer?.address();
	if (!address || typeof address === 'string') {
		throw new Error('Could not determine the local preview server port.');
	}
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
					{ cause: fallbackError }
				);
			}
			throw new Error('Could not launch Chromium for OG capture.', {
				cause: fallbackError,
			});
		}
	}
}
