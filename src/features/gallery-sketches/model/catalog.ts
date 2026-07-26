import type { GallerySketch, GallerySketchMeta } from '../types';
import { validateGallerySketchMeta } from './metadata';

export const MAX_SKETCH_CODE_CHARS = 300_000;

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
		const metadataValidation = validateGallerySketchMeta(getModuleDefault(moduleValue));
		if (!metadataValidation.valid) {
			throw new Error(`Invalid gallery sketch metadata: ${path}: ${metadataValidation.reason}`);
		}
		const meta = metadataValidation.metadata;

		if (meta.slug !== folderSlug) {
			throw new Error(
				`Gallery sketch slug mismatch: ${path} declares "${meta.slug}" but folder is "${folderSlug}"`
			);
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

		sketches.push({ ...meta, textmodeCode });
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
