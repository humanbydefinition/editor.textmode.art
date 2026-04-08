import path from 'node:path';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { normalizeSlug, validateSlug } from '../../shared/slug.js';
import {
  getScreenshotCaptureBaseUrl,
  getScreenshotPreviewPath,
  getScreenshotPreviewToken,
  getScreenshotStorageDir,
  toPublicScreenshotUrl,
} from './screenshot.config.js';

const SCREENSHOT_WIDTH = 1536;
const SCREENSHOT_HEIGHT = 816;
const DEFAULT_CAPTURE_FRAME = 2;
const MAX_CAPTURE_FRAME = 1000;

export type CaptureOptions = {
  captureAtFrame?: number;
};

export class ScreenshotService {
  private readonly storageDir: string;
  private readonly baseUrl: string;
  private readonly previewToken?: string;

  constructor() {
    this.storageDir = getScreenshotStorageDir();
    this.baseUrl = getScreenshotCaptureBaseUrl();
    this.previewToken = getScreenshotPreviewToken();
  }

  private async ensureStorageDir(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
  }

  private normalizeAndValidate(rawSlug: string): string {
    const slug = normalizeSlug(rawSlug);
    const validation = validateSlug(slug);
    if (!validation.valid) {
      throw new Error(`Invalid slug for screenshot capture: ${validation.reason}`);
    }
    return slug;
  }

  async capture(rawSlug: string, options?: CaptureOptions): Promise<string> {
    if (!this.previewToken) {
      throw new Error('SCREENSHOT_PREVIEW_TOKEN is required for screenshot capture.');
    }

    const slug = this.normalizeAndValidate(rawSlug);
    const captureAtFrame = Math.max(1, Math.min(options?.captureAtFrame ?? DEFAULT_CAPTURE_FRAME, MAX_CAPTURE_FRAME));
    await this.ensureStorageDir();

    const browser = await this.launchBrowser();

    try {
      const page = await browser.newPage({
        viewport: { width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT },
      });

      await page.setExtraHTTPHeaders({
        'x-screenshot-preview-token': this.previewToken,
      });
      const previewUrl = new URL(getScreenshotPreviewPath(slug), `${this.baseUrl}/`);
      previewUrl.searchParams.set('frame', String(captureAtFrame));
      const url = previewUrl.toString();

      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      if (!response) {
        throw new Error(`Preview navigation returned no response for "${slug}" (${url}).`);
      }
      if (!response.ok()) {
        throw new Error(
          `Preview route returned ${response.status()} ${response.statusText()} for "${slug}" (${url}).`,
        );
      }

      await page.waitForFunction(() => {
        const status = document.body?.dataset.status;
        return status === 'ready' || status === 'error';
      }, { timeout: 30000 });

      const previewStatus = await page.evaluate(() => document.body?.dataset.status ?? 'unknown');
      if (previewStatus === 'error') {
        const previewError = await page.evaluate(() => document.body?.dataset.error ?? 'Unknown preview error');
        throw new Error(`Screenshot preview failed for "${slug}": ${previewError}`);
      }
      if (previewStatus !== 'ready') {
        throw new Error(`Screenshot preview entered unexpected state for "${slug}": ${previewStatus}`);
      }

      // Ensure one more paint cycle before capturing.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => resolve());
            });
          }),
      );

      const canvas = page.locator('canvas').first();
      await canvas.waitFor({ state: 'visible', timeout: 30000 });
      const buffer = await canvas.screenshot({ type: 'png' });

      const fileName = `${slug}.png`;
      const filePath = path.resolve(this.storageDir, fileName);
      await fs.writeFile(filePath, buffer);
      return toPublicScreenshotUrl(fileName);
    } finally {
      await browser.close();
    }
  }

  private async launchBrowser() {
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      // Force software-backed WebGL in environments without GPU/WebGL2.
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--enable-unsafe-swiftshader',
    ];

    try {
      return await chromium.launch({
        headless: true,
        // Prefer full Chromium over headless-shell to maximize WebGL2 compatibility.
        channel: 'chromium',
        args: launchArgs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const missingChromiumChannel =
        message.includes('channel') ||
        message.includes('Executable doesn\'t exist') ||
        message.includes('playwright install');

      if (!missingChromiumChannel) {
        throw error;
      }

      // Fallback for environments where channel binaries are unavailable.
      return chromium.launch({
        headless: true,
        args: launchArgs,
      });
    }
  }
}

export const screenshotService = new ScreenshotService();
