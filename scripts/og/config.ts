export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_CAPTURE_TIMEOUT_MS = 30_000;
export const OG_PREVIEW_PATH = '/scripts/og/preview/index.html';

export const SITE_OG_CONFIG = {
	sketch: 'textmodeshift',
	frame: 60,
	output: 'public/og.png',
} as const;

export const OG_CHROMIUM_ARGS = [
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--disable-dev-shm-usage',
	'--enable-webgl',
	'--ignore-gpu-blocklist',
	'--use-gl=angle',
	'--use-angle=swiftshader-webgl',
	'--enable-unsafe-swiftshader',
] as const;
