import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { OG_CAPTURE_TIMEOUT_MS, OG_CHROMIUM_ARGS, OG_HEIGHT, OG_PREVIEW_PATH, OG_WIDTH } from './config';
import type { OgJob, OgPreviewRequest, OgPreviewResult, OgRenderResult } from './contracts';
import { assertOgPng } from './image';

type RenderStage = 'prepare' | 'navigate' | 'render' | 'capture' | 'validate' | 'commit';

export async function generateOgImages(
	jobs: readonly OgJob[],
	options: { projectRoot: string }
): Promise<readonly OgRenderResult[]> {
	if (jobs.length === 0) return [];

	let server: ViteDevServer | undefined;
	let browser: Browser | undefined;

	try {
		server = await startPreviewServer(options.projectRoot);
		browser = await launchChromium();
		const previewUrl = getPreviewUrl(server);
		const results: OgRenderResult[] = [];

		for (const job of jobs) {
			results.push(await renderJob(browser, previewUrl, job));
		}

		return results;
	} catch (error) {
		if (error instanceof OgGenerationError) throw error;
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Could not start the OG rendering session: ${message}`, { cause: error });
	} finally {
		await Promise.allSettled([browser?.close(), server?.close()]);
	}
}

class OgGenerationError extends Error {}

async function renderJob(browser: Browser, previewUrl: string, job: OgJob): Promise<OgRenderResult> {
	const temporaryOutput = path.join(
		path.dirname(job.outputPath),
		`.${path.basename(job.outputPath)}.${randomUUID()}.tmp.png`
	);
	let context: BrowserContext | undefined;
	let stage: RenderStage = 'prepare';

	try {
		await mkdir(path.dirname(job.outputPath), { recursive: true });
		const code = await readFile(job.codePath, 'utf8');
		context = await browser.newContext({
			viewport: { width: OG_WIDTH, height: OG_HEIGHT },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => pageErrors.push(error.message));

		stage = 'navigate';
		await page.goto(previewUrl, {
			waitUntil: 'domcontentloaded',
			timeout: OG_CAPTURE_TIMEOUT_MS,
		});
		await page.waitForFunction(() => typeof window.renderOg === 'function', undefined, {
			timeout: OG_CAPTURE_TIMEOUT_MS,
		});

		stage = 'render';
		const request: OgPreviewRequest = {
			code,
			frame: job.frame,
			card: job.card,
		};
		let previewResult: OgPreviewResult;
		try {
			previewResult = await page.evaluate((previewRequest) => window.renderOg(previewRequest), request);
		} catch (error) {
			const status = await page.locator('body').getAttribute('data-status');
			const previewError = await page.locator('body').getAttribute('data-error');
			const details =
				previewError ?? pageErrors.at(-1) ?? (error instanceof Error ? error.message : String(error));
			throw new Error(`Preview failed (${status ?? 'unknown'}): ${details}`, { cause: error });
		}

		if (previewResult.frame !== job.frame) {
			throw new Error(`Preview rendered frame ${previewResult.frame}; expected ${job.frame}.`);
		}
		if (previewResult.kind !== job.card.kind) {
			throw new Error(`Preview rendered ${previewResult.kind}; expected ${job.card.kind}.`);
		}
		if ((await page.locator('body').getAttribute('data-status')) !== 'ready') {
			throw new Error('Preview did not reach ready state.');
		}

		stage = 'capture';
		await page.screenshot({
			path: temporaryOutput,
			clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT },
			animations: 'disabled',
			type: 'png',
		});

		stage = 'validate';
		await assertOgPng(temporaryOutput);

		stage = 'commit';
		await rename(temporaryOutput, job.outputPath);

		return {
			slug: job.slug,
			outputPath: job.outputPath,
			...previewResult,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new OgGenerationError(
			`Could not generate ${job.card.kind} OG image for "${job.slug}" during ${stage}: ${message}`,
			{ cause: error }
		);
	} finally {
		await context?.close();
		await rm(temporaryOutput, { force: true });
	}
}

async function startPreviewServer(projectRoot: string): Promise<ViteDevServer> {
	const server = await createServer({
		configFile: false,
		mode: 'development',
		root: projectRoot,
		appType: 'mpa',
		logLevel: 'error',
		optimizeDeps: {
			entries: ['scripts/og/preview/index.html'],
		},
		server: {
			host: '127.0.0.1',
			port: 0,
			strictPort: false,
			hmr: false,
			watch: null,
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
	return `http://127.0.0.1:${address.port}${OG_PREVIEW_PATH}`;
}

async function launchChromium(): Promise<Browser> {
	try {
		return await chromium.launch({
			headless: true,
			channel: 'chromium',
			args: [...OG_CHROMIUM_ARGS],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("Executable doesn't exist") || message.includes('playwright install')) {
			throw new Error(
				'Playwright Chromium is not installed. Run `npm run playwright:install` once, then retry.',
				{ cause: error }
			);
		}
		throw new Error(`Could not launch the pinned Chromium renderer: ${message}`, { cause: error });
	}
}
