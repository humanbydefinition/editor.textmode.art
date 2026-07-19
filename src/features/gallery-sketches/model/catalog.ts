import type { GallerySketch, GallerySketchMeta, GallerySketchSummary, SocialLink } from '../types';
import { validateSlug } from './slug';

export const MAX_SKETCH_CODE_CHARS = 300_000;
export const DEFAULT_GALLERY_OG_FRAME = 60;
export const MIN_GALLERY_OG_FRAME = 1;
export const MAX_GALLERY_OG_FRAME = 1000;

type ModuleValue = unknown;
type ModuleMap = Record<string, ModuleValue>;

const metaModules = import.meta.glob<GallerySketchMeta>('../../../../sketches/*/meta.json', {
	eager: true,
	import: 'default',
});

const codeModules = import.meta.glob<string>('../../../../sketches/*/sketch.js', {
	eager: true,
	import: 'default',
	query: '?raw',
});

let cachedCatalog: GallerySketch[] | null = null;

export function getGallerySketchCatalog(): GallerySketch[] {
	cachedCatalog ??= buildGallerySketchCatalog(metaModules, codeModules);
	return cachedCatalog;
}

export function getGallerySketchBySlug(slug: string): GallerySketch | null {
	return getGallerySketchCatalog().find((sketch) => sketch.slug === slug) ?? null;
}

export function getRandomGallerySketch(excludeSlug?: string, rng: () => number = Math.random): GallerySketch | null {
	return pickRandomGallerySketch(getGallerySketchCatalog(), excludeSlug, rng);
}

export function pickRandomGallerySketch(
	sketches: GallerySketch[],
	excludeSlug?: string,
	rng: () => number = Math.random
): GallerySketch | null {
	if (sketches.length === 0) return null;

	const candidates =
		excludeSlug && sketches.length > 1 ? sketches.filter((sketch) => sketch.slug !== excludeSlug) : sketches;
	if (candidates.length === 0) return null;

	const index = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
	return candidates[index] ?? null;
}

export function toGallerySketchSummary(sketch: GallerySketch): GallerySketchSummary {
	return {
		status: sketch.status,
		slug: sketch.slug,
		title: sketch.title,
		description: sketch.description,
		authorName: sketch.authorName,
		license: sketch.license,
		socialLinks: sketch.socialLinks,
	};
}

export function buildGallerySketchCatalog(metaModuleMap: ModuleMap, codeModuleMap: ModuleMap): GallerySketch[] {
	const codeByFolder = new Map<string, string>();

	for (const [path, moduleValue] of Object.entries(codeModuleMap)) {
		const folderSlug = extractFolderSlug(path, 'sketch.js');
		const code = getModuleDefault(moduleValue);
		if (typeof code !== 'string') {
			throw new Error(`Gallery sketch code must be a string: ${path}`);
		}
		codeByFolder.set(folderSlug, code);
	}

	const sketches: GallerySketch[] = [];
	const slugs = new Set<string>();

	for (const [path, moduleValue] of Object.entries(metaModuleMap)) {
		const folderSlug = extractFolderSlug(path, 'meta.json');
		const meta = getModuleDefault(moduleValue);
		assertGallerySketchMeta(meta, path);

		if (meta.slug !== folderSlug) {
			throw new Error(
				`Gallery sketch slug mismatch: ${path} declares "${meta.slug}" but folder is "${folderSlug}"`
			);
		}

		const slugValidation = validateSlug(meta.slug);
		if (!slugValidation.valid) {
			throw new Error(`Invalid gallery sketch slug "${meta.slug}": ${slugValidation.reason}`);
		}

		if (slugs.has(meta.slug)) {
			throw new Error(`Duplicate gallery sketch slug: ${meta.slug}`);
		}
		slugs.add(meta.slug);

		const textmodeCode = codeByFolder.get(folderSlug);
		if (typeof textmodeCode !== 'string') {
			throw new Error(`Missing sketch.js for gallery sketch: ${folderSlug}`);
		}

		const trimmedCode = textmodeCode.trim();
		if (trimmedCode.length === 0) {
			throw new Error(`Gallery sketch code must not be empty: ${folderSlug}`);
		}
		if (textmodeCode.length > MAX_SKETCH_CODE_CHARS) {
			throw new Error(`Gallery sketch code is too large: ${folderSlug}`);
		}

		sketches.push({
			status: 'APPROVED',
			...meta,
			textmodeCode,
		});
	}

	return sketches.sort((a, b) => a.slug.localeCompare(b.slug));
}

function getModuleDefault(moduleValue: ModuleValue): unknown {
	if (moduleValue && typeof moduleValue === 'object' && 'default' in moduleValue) {
		return (moduleValue as { default: unknown }).default;
	}
	return moduleValue;
}

function extractFolderSlug(path: string, fileName: 'meta.json' | 'sketch.js'): string {
	const normalized = path.replace(/\\/g, '/').replace(/\?.*$/, '');
	const suffix = `/${fileName}`;
	if (!normalized.endsWith(suffix)) {
		throw new Error(`Unexpected gallery sketch module path: ${path}`);
	}

	const withoutFile = normalized.slice(0, -suffix.length);
	const folderSlug = withoutFile.split('/').pop();
	if (!folderSlug) {
		throw new Error(`Could not infer gallery sketch folder from path: ${path}`);
	}
	return folderSlug;
}

function assertGallerySketchMeta(value: unknown, path: string): asserts value is GallerySketchMeta {
	if (!value || typeof value !== 'object') {
		throw new Error(`Gallery sketch metadata must be an object: ${path}`);
	}

	const meta = value as Partial<GallerySketchMeta>;
	assertString(meta.slug, 'slug', path, { required: true, maxLength: 32 });
	assertString(meta.title, 'title', path, { required: true, maxLength: 120 });
	assertNullableString(meta.description, 'description', path, 300);
	assertNullableString(meta.authorName, 'authorName', path, 80);
	assertNullableString(meta.license, 'license', path, 120);
	assertString(meta.createdAt, 'createdAt', path, { required: true, maxLength: 64 });
	if (
		meta.ogFrame !== undefined &&
		(!Number.isInteger(meta.ogFrame) || meta.ogFrame < MIN_GALLERY_OG_FRAME || meta.ogFrame > MAX_GALLERY_OG_FRAME)
	) {
		throw new Error(
			`Gallery sketch metadata field "ogFrame" must be an integer from ${MIN_GALLERY_OG_FRAME} to ${MAX_GALLERY_OG_FRAME}: ${path}`
		);
	}

	if (Number.isNaN(Date.parse(meta.createdAt as string))) {
		throw new Error(`Gallery sketch metadata field "createdAt" must be an ISO date string: ${path}`);
	}

	if (meta.socialLinks !== null && !Array.isArray(meta.socialLinks)) {
		throw new Error(`Gallery sketch metadata field "socialLinks" must be an array or null: ${path}`);
	}

	if (Array.isArray(meta.socialLinks)) {
		if (meta.socialLinks.length > 6) {
			throw new Error(`Gallery sketch metadata field "socialLinks" must contain at most 6 links: ${path}`);
		}
		meta.socialLinks.forEach((link, index) => assertSocialLink(link, path, index));
	}
}

function assertString(
	value: unknown,
	field: string,
	path: string,
	options: { required: boolean; maxLength: number }
): void {
	if (typeof value !== 'string') {
		throw new Error(`Gallery sketch metadata field "${field}" must be a string: ${path}`);
	}
	const trimmed = value.trim();
	if (options.required && trimmed.length === 0) {
		throw new Error(`Gallery sketch metadata field "${field}" must not be empty: ${path}`);
	}
	if (value.length > options.maxLength) {
		throw new Error(`Gallery sketch metadata field "${field}" is too long: ${path}`);
	}
}

function assertNullableString(value: unknown, field: string, path: string, maxLength: number): void {
	if (value === null) return;
	assertString(value, field, path, { required: false, maxLength });
}

function assertSocialLink(value: unknown, path: string, index: number): asserts value is SocialLink {
	if (!value || typeof value !== 'object') {
		throw new Error(`Gallery sketch social link #${index + 1} must be an object: ${path}`);
	}

	const link = value as Partial<SocialLink>;
	assertString(link.label, `socialLinks[${index}].label`, path, { required: true, maxLength: 32 });
	assertString(link.url, `socialLinks[${index}].url`, path, { required: true, maxLength: 200 });

	let url: URL;
	try {
		url = new URL(link.url as string);
	} catch {
		throw new Error(`Gallery sketch social link #${index + 1} has an invalid URL: ${path}`);
	}

	if (url.protocol !== 'https:') {
		throw new Error(`Gallery sketch social link #${index + 1} must use HTTPS: ${path}`);
	}
}
