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

  async capture(rawSlug: string): Promise<string> {
    if (!this.previewToken) {
      throw new Error('SCREENSHOT_PREVIEW_TOKEN is required for screenshot capture.');
    }

    const slug = this.normalizeAndValidate(rawSlug);
    await this.ensureStorageDir();

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const page = await browser.newPage({
        viewport: { width: 1536, height: 816 },
      });
      await page.setExtraHTTPHeaders({
        'x-screenshot-preview-token': this.previewToken,
      });
      const url = new URL(getScreenshotPreviewPath(slug), `${this.baseUrl}/`).toString();

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await page.waitForSelector('body[data-ready="true"]', { timeout: 30000 });
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
}

export const screenshotService = new ScreenshotService();
