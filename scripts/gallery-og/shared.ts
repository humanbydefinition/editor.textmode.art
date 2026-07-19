import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_OG_FRAME, MAX_OG_FRAME, MIN_OG_FRAME, OG_HEIGHT, OG_WIDTH } from './contracts';

export {
	DEFAULT_OG_FRAME,
	escapeXml,
	formatOgAuthor,
	getFittedFontSize,
	MAX_OG_FRAME,
	MIN_OG_FRAME,
	OG_HEIGHT,
	OG_WIDTH,
} from './contracts';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface GalleryOgMeta {
	slug: string;
	title: string;
	description: string | null;
	authorName: string | null;
	license: string | null;
	socialLinks: Array<{ label: string; url: string }> | null;
	createdAt: string;
	ogFrame?: number;
}

export interface GalleryOgEntry {
	directory: string;
	metaPath: string;
	sketchPath: string;
	ogPath: string;
	meta: GalleryOgMeta;
}

export interface GenerateOgArguments {
	help: boolean;
	all: boolean;
	slug?: string;
	frame?: number;
}

export function parseGenerateOgArguments(args: string[]): GenerateOgArguments {
	let help = false;
	let all = false;
	let slug: string | undefined;
	let frame: number | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--help' || argument === '-h') {
			help = true;
			continue;
		}
		if (argument === '--all') {
			all = true;
			continue;
		}
		if (argument === '--frame') {
			if (frame !== undefined) throw new Error('--frame may only be specified once.');
			const value = args[index + 1];
			if (value === undefined) throw new Error('--frame requires a value.');
			frame = parseOgFrame(value, '--frame');
			index += 1;
			continue;
		}
		if (argument.startsWith('--frame=')) {
			if (frame !== undefined) throw new Error('--frame may only be specified once.');
			frame = parseOgFrame(argument.slice('--frame='.length), '--frame');
			continue;
		}
		if (argument.startsWith('-')) {
			throw new Error(`Unknown option: ${argument}`);
		}
		if (slug !== undefined) {
			throw new Error(`Unexpected extra argument: ${argument}`);
		}
		slug = argument;
	}

	if (help) return { help: true, all, slug, frame };
	if (all && slug) throw new Error('Use either a sketch slug or --all, not both.');
	if (all && frame !== undefined) throw new Error('--frame cannot be combined with --all; set ogFrame per sketch.');
	if (!all && !slug) throw new Error('Provide a sketch slug or use --all.');
	if (slug) assertSlug(slug);

	return { help: false, all, slug, frame };
}

export function parseOgFrame(value: unknown, label = 'ogFrame'): number {
	const frame = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
	if (!Number.isInteger(frame) || frame < MIN_OG_FRAME || frame > MAX_OG_FRAME) {
		throw new Error(`${label} must be an integer from ${MIN_OG_FRAME} to ${MAX_OG_FRAME}.`);
	}
	return frame;
}

export function getOgFrame(meta: GalleryOgMeta): number {
	return meta.ogFrame === undefined ? DEFAULT_OG_FRAME : parseOgFrame(meta.ogFrame);
}

export async function readGalleryOgEntries(root: string): Promise<GalleryOgEntry[]> {
	const sketchesDirectory = path.resolve(root, 'sketches');
	const directoryEntries = await readdir(sketchesDirectory, { withFileTypes: true });
	const entries: GalleryOgEntry[] = [];

	for (const directoryEntry of directoryEntries) {
		if (!directoryEntry.isDirectory()) continue;
		const directory = path.join(sketchesDirectory, directoryEntry.name);
		const metaPath = path.join(directory, 'meta.json');
		const sketchPath = path.join(directory, 'sketch.js');
		const ogPath = path.join(directory, 'og.png');
		let rawMeta: unknown;
		try {
			rawMeta = JSON.parse(await readFile(metaPath, 'utf8')) as unknown;
		} catch (error) {
			throw new Error(`Could not read valid gallery metadata JSON: ${metaPath}`, { cause: error });
		}
		const meta = validateGalleryOgMeta(rawMeta, metaPath);

		if (meta.slug !== directoryEntry.name) {
			throw new Error(`${metaPath} declares slug "${meta.slug}" but its folder is "${directoryEntry.name}".`);
		}
		await readFile(sketchPath, 'utf8');
		entries.push({ directory, metaPath, sketchPath, ogPath, meta });
	}

	return entries.sort((left, right) => left.meta.slug.localeCompare(right.meta.slug));
}

export function validateGalleryOgMeta(value: unknown, source = 'meta.json'): GalleryOgMeta {
	if (!value || typeof value !== 'object') throw new Error(`${source} must contain a JSON object.`);
	const meta = value as Partial<GalleryOgMeta>;
	assertString(meta.slug, 'slug', source, 32, true);
	assertSlug(meta.slug as string);
	assertString(meta.title, 'title', source, 120, true);
	assertNullableString(meta.description, 'description', source, 300);
	assertNullableString(meta.authorName, 'authorName', source, 80);
	assertNullableString(meta.license, 'license', source, 120);
	assertString(meta.createdAt, 'createdAt', source, 64, true);
	if (Number.isNaN(Date.parse(meta.createdAt as string))) {
		throw new Error(`${source} field "createdAt" must be an ISO date string.`);
	}
	if (meta.ogFrame !== undefined) parseOgFrame(meta.ogFrame, `${source} field "ogFrame"`);
	if (meta.socialLinks !== null && !Array.isArray(meta.socialLinks)) {
		throw new Error(`${source} field "socialLinks" must be an array or null.`);
	}
	if (Array.isArray(meta.socialLinks)) {
		if (meta.socialLinks.length > 6) {
			throw new Error(`${source} field "socialLinks" must contain at most 6 links.`);
		}
		meta.socialLinks.forEach((link, index) => assertSocialLink(link, source, index));
	}

	return meta as GalleryOgMeta;
}

export async function validatePng(filePath: string): Promise<{ width: number; height: number }> {
	let buffer: Buffer;
	try {
		buffer = await readFile(filePath);
	} catch (error) {
		throw new Error(`Missing gallery OG image: ${filePath}`, { cause: error });
	}
	if (
		buffer.length < 24 ||
		!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) ||
		buffer.toString('ascii', 12, 16) !== 'IHDR'
	) {
		throw new Error(`Gallery OG image is not a valid PNG: ${filePath}`);
	}
	const width = buffer.readUInt32BE(16);
	const height = buffer.readUInt32BE(20);
	if (width !== OG_WIDTH || height !== OG_HEIGHT) {
		throw new Error(`Gallery OG image must be ${OG_WIDTH}x${OG_HEIGHT}, got ${width}x${height}: ${filePath}`);
	}
	return { width, height };
}

export async function publishGallerySocialPages(root: string): Promise<number> {
	const entries = await readGalleryOgEntries(root);
	if (entries.length === 0) return 0;

	const distDirectory = path.resolve(root, 'dist');
	const baseHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8');
	const ogDirectory = path.join(distDirectory, 'og');
	await Promise.all(entries.map((entry) => validatePng(entry.ogPath)));
	await mkdir(ogDirectory, { recursive: true });

	for (const entry of entries) {
		await copyFile(entry.ogPath, path.join(ogDirectory, `${entry.meta.slug}.png`));
		const routeDirectory = path.join(distDirectory, 's', entry.meta.slug);
		await mkdir(routeDirectory, { recursive: true });
		await writeFile(path.join(routeDirectory, 'index.html'), renderGallerySocialHtml(baseHtml, entry.meta), 'utf8');
	}

	return entries.length;
}

export function renderGallerySocialHtml(baseHtml: string, meta: GalleryOgMeta): string {
	const canonicalUrl = `https://editor.textmode.art/s/${meta.slug}/`;
	const imageUrl = `https://editor.textmode.art/og/${meta.slug}.png`;
	const title = `${meta.title} | editor.textmode.art`;
	const authorName = meta.authorName?.trim() || null;
	const description =
		meta.description?.trim() || `A textmode.js gallery sketch by ${authorName ?? 'an anonymous contributor'}.`;
	const alt = `${meta.title} by ${authorName ?? 'an anonymous contributor'} on editor.textmode.art`;
	const dynamicHead = `
	<title>${escapeHtml(title)}</title>
	<link rel="canonical" href="${canonicalUrl}" />
	<meta name="description" content="${escapeHtml(description)}" />
	<meta name="robots" content="index, follow" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="editor.textmode.art" />
	<meta property="og:url" content="${canonicalUrl}" />
	<meta property="og:title" content="${escapeHtml(title)}" />
	<meta property="og:description" content="${escapeHtml(description)}" />
	<meta property="og:image" content="${imageUrl}" />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="${OG_WIDTH}" />
	<meta property="og:image:height" content="${OG_HEIGHT}" />
	<meta property="og:image:alt" content="${escapeHtml(alt)}" />
	<meta property="og:locale" content="en_US" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="${canonicalUrl}" />
	<meta name="twitter:title" content="${escapeHtml(title)}" />
	<meta name="twitter:description" content="${escapeHtml(description)}" />
	<meta name="twitter:image" content="${imageUrl}" />
	<meta name="twitter:image:alt" content="${escapeHtml(alt)}" />
`;

	const stripped = baseHtml
		.replace(/<title>[\s\S]*?<\/title>/i, '')
		.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
		.replace(/<meta\s+name=["'](?:description|robots)["'][^>]*>/gi, '')
		.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
		.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');

	if (!stripped.includes('</head>')) throw new Error('Built index.html is missing </head>.');
	return stripped.replace('</head>', `${dynamicHead}</head>`);
}

export function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function assertSlug(slug: string): void {
	if (slug.length < 3 || slug.length > 32 || !SLUG_PATTERN.test(slug)) {
		throw new Error('Slug must be 3-32 characters using lowercase letters, numbers, and hyphens only.');
	}
}

function assertString(value: unknown, field: string, source: string, maxLength: number, required: boolean): void {
	if (typeof value !== 'string') throw new Error(`${source} field "${field}" must be a string.`);
	if (required && value.trim().length === 0) throw new Error(`${source} field "${field}" must not be empty.`);
	if (value.length > maxLength) throw new Error(`${source} field "${field}" exceeds ${maxLength} characters.`);
}

function assertNullableString(value: unknown, field: string, source: string, maxLength: number): void {
	if (value === null) return;
	assertString(value, field, source, maxLength, false);
}

function assertSocialLink(value: unknown, source: string, index: number): void {
	if (!value || typeof value !== 'object') {
		throw new Error(`${source} social link #${index + 1} must be an object.`);
	}
	const link = value as { label?: unknown; url?: unknown };
	assertString(link.label, `socialLinks[${index}].label`, source, 32, true);
	assertString(link.url, `socialLinks[${index}].url`, source, 200, true);
	let url: URL;
	try {
		url = new URL(link.url as string);
	} catch {
		throw new Error(`${source} social link #${index + 1} has an invalid URL.`);
	}
	if (url.protocol !== 'https:') {
		throw new Error(`${source} social link #${index + 1} must use HTTPS.`);
	}
}
