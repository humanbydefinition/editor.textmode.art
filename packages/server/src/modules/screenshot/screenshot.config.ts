import path from 'node:path';
import { env } from '../../config/env.js';

export const SCREENSHOT_PREVIEW_ROUTE = '/_internal/preview/:slug';
export const SCREENSHOT_PREVIEW_PATH_PREFIX = '/_internal/preview';

export function getScreenshotStorageDir(): string {
  if (env.SCREENSHOT_STORAGE_DIR) {
    return path.resolve(env.SCREENSHOT_STORAGE_DIR);
  }
  return path.resolve(process.cwd(), 'storage');
}

export function getScreenshotCaptureBaseUrl(): string {
  const configured = env.SCREENSHOT_BASE_URL ?? `http://127.0.0.1:${env.PORT}`;
  return configured.replace(/\/$/, '');
}

export function toPublicScreenshotUrl(fileName: string): string {
  return `/storage/${fileName}`;
}

export function getScreenshotPreviewToken(): string | undefined {
  return env.SCREENSHOT_PREVIEW_TOKEN;
}

export function getScreenshotPreviewPath(slug: string): string {
  return `${SCREENSHOT_PREVIEW_PATH_PREFIX}/${encodeURIComponent(slug)}`;
}
