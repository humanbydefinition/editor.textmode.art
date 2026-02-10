import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { env } from '../../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ScreenshotService {
  private storageDir: string;
  private baseUrl: string;

  constructor() {
    // Determine storage directory relative to project root
    // Assuming server root is at ../../../.. from here (src/modules/screenshot)
    // Actually, simpler to rely on env or a fixed path relative to CWD if running from server root
    this.storageDir = path.resolve(process.cwd(), 'storage');
    this.baseUrl = `http://localhost:${env.PORT || 3000}`;
  }

  async init() {
    // Ensure storage directory exists
    try {
      await fs.access(this.storageDir);
    } catch {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
  }

  async capture(slug: string): Promise<string> {
    await this.init();

    const browser = await chromium.launch({
      args: [
        '--use-gl=angle',
        '--use-angle=gl', 
        '--ignore-gpu-blocklist', 
        '--enable-webgl', 
        '--enable-webgl2'
      ]
    });
    const page = await browser.newPage();
    
    // Set viewport to standard OG image size
    await page.setViewportSize({ width: 1200, height: 630 });

    try {
      const url = `${this.baseUrl}/preview/${slug}`;
      console.log(`[ScreenshotService] Navigating to ${url}`);
      
      // Debugging: Log console messages and errors from the page
      page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));
      page.on('pageerror', err => console.error(`[Browser Error] ${err.message}`));
      page.on('requestfailed', req => console.error(`[Browser Request Failed] ${req.url()} - ${req.failure()?.errorText}`));

      await page.goto(url);

      // Wait for sketch readiness signal
      await page.waitForSelector('body[data-ready="true"]', { timeout: 30000 });

      // Find the canvas
      const canvas = page.locator('canvas').first();
      
      // Take screenshot of the canvas element
      const buffer = await canvas.screenshot();
      
      const fileName = `${slug}.png`;
      const filePath = path.resolve(this.storageDir, fileName);
      
      await fs.writeFile(filePath, buffer);
      console.log(`[ScreenshotService] Saved screenshot to ${filePath}`);
      
      return `/storage/${fileName}`;
    } catch (error) {
      console.error('[ScreenshotService] Error capturing screenshot:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

export const screenshotService = new ScreenshotService();
