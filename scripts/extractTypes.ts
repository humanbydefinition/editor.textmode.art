/**
 * Type Extraction Script for Monaco IntelliSense
 *
 * This script extracts ALL .d.ts files from specified libraries and bundles them
 * into a JSON map of "file path" -> "content".
 *
 * Key features:
 * - Preserves module structure for internal imports to work correctly
 * - Preserves module augmentations so TypeScript can merge declarations
 * - Generates a minimal globals.d.ts for live coding environment
 * - Strips @example blocks to reduce bundle size
 * - Normalizes JSDoc {@link ...} tags into Monaco-friendly markdown/plain text
 * - Excludes $- and _-prefixed callable declarations (e.g. $foo, _bar)
 */
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { normalizeJSDocLinks } from './lib/normalizeJSDocLinks.js';

const require = createRequire(import.meta.url);

// ============================================================================
// Configuration
// ============================================================================

interface LibraryConfig {
	name: string;
	typesRoot?: string;
}

interface TypeGenerationConfig {
	id: string; // 'textmode' | 'engine' etc.
	libraries: LibraryConfig[];
	output: string;
	includeGlobals?: boolean;
}

const CONFIGS: TypeGenerationConfig[] = [
	{
		id: 'textmode',
		libraries: [
			{ name: 'textmode.js' },
			{ name: 'textmode.synth.js' },
			{ name: 'textmode.filters.js' },
			{ name: 'textmode.export.js' },
			{ name: 'textmode.figlet.js' },
		],
		output: 'src/textmode/config/generatedTypes.ts',
		includeGlobals: true,
	},
];

interface ContentFilterResult {
	content: string;
	removedCount: number;
}

interface Range {
	start: number;
	end: number;
}

// ============================================================================
// Global Declaration Generation
// ============================================================================

/**
 * Generate a minimal globals.d.ts for the live coding environment.
 * Side-effect imports activate package module augmentations for bundled add-ons.
 */
function generateGlobalsContent(): string {
	return `import 'textmode.synth.js';
import 'textmode.filters.js';
import 'textmode.export.js';
import 'textmode.figlet.js';
import type { Textmodifier } from 'textmode.js';
import type { EasingFunction } from 'textmode.synth.js';

declare global {
  // Main Textmode Instance
  const t: Textmodifier;

  interface AudioAnalysis {
    fft(): Uint8Array;
    waveform(): Uint8Array;
    bass(): number;
    mid(): number;
    high(): number;
    volume(): number;
    timestamp(): number;
    hasData(): boolean;
  }

  // Latest external audio input analysis frame
  const audio: AudioAnalysis;

  // Bundled plugin globals
  const SynthPlugin: typeof import('textmode.synth.js').SynthPlugin;
  const FiltersPlugin: typeof import('textmode.filters.js').FiltersPlugin;
  const ExportPlugin: typeof import('textmode.export.js').ExportPlugin;
  const FigletPlugin: typeof import('textmode.figlet.js').FigletPlugin;
  const createFiltersPlugin: typeof import('textmode.filters.js').createFiltersPlugin;
  const createTextmodeExportPlugin: typeof import('textmode.export.js').createTextmodeExportPlugin;

  // Bundled library globals
  const SynthSource: typeof import('textmode.synth.js').SynthSource;
  const TextmodeFigFont: typeof import('textmode.figlet.js').TextmodeFigFont;
  const FigFontParser: typeof import('textmode.figlet.js').FigFontParser;
  const FigLayoutEngine: typeof import('textmode.figlet.js').FigLayoutEngine;
  const FigSmushRules: typeof import('textmode.figlet.js').FigSmushRules;
  const FIGFONT_REQUIRED_CODEPOINTS: typeof import('textmode.figlet.js').FIGFONT_REQUIRED_CODEPOINTS;
  const EASING_FUNCTIONS: typeof import('textmode.synth.js').EASING_FUNCTIONS;
  const setGlobalErrorCallback: typeof import('textmode.synth.js').setGlobalErrorCallback;

  // Cleanup
  function onDispose(fn: () => void): void;

  // Synth Source Functions (re-exported as globals)
  const osc: typeof import('textmode.synth.js').osc;
  const noise: typeof import('textmode.synth.js').noise;
  const plasma: typeof import('textmode.synth.js').plasma;
  const moire: typeof import('textmode.synth.js').moire;
  const gradient: typeof import('textmode.synth.js').gradient;
  const solid: typeof import('textmode.synth.js').solid;
  const shape: typeof import('textmode.synth.js').shape;
  const src: typeof import('textmode.synth.js').src;
  const char: typeof import('textmode.synth.js').char;
  const voronoi: typeof import('textmode.synth.js').voronoi;
  const charColor: typeof import('textmode.synth.js').charColor;
  const cellColor: typeof import('textmode.synth.js').cellColor;
  const paint: typeof import('textmode.synth.js').paint;

  
  // Array Extensions for synth modulation
  interface Array<T> {
    fast(speed?: number): this;
    smooth(speed?: number): this;
    ease(ease: EasingFunction): this;
    offset(offset: number): this;
    fit(low: number, high: number): this;
  }
}
`;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Recursively find all .d.ts files
 */
function findAllDtsFiles(dir: string): string[] {
	const files: string[] = [];

	if (!fs.existsSync(dir)) {
		return files;
	}

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...findAllDtsFiles(fullPath));
		} else if (entry.name.endsWith('.d.ts') && !entry.name.endsWith('.d.ts.map')) {
			files.push(fullPath);
		}
	}

	return files;
}

/**
 * Get the types directory for a package.
 * Uses require.resolve to locate the package regardless of hoisting.
 */
function getTypesDir(packageName: string): string | null {
	let packageDir: string;
	try {
		// Resolve the main entry point, then walk up to find package.json
		const mainEntry = require.resolve(packageName);
		let dir = path.dirname(mainEntry);
		while (dir !== path.dirname(dir)) {
			if (fs.existsSync(path.join(dir, 'package.json'))) {
				const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
				if (pkg.name === packageName) {
					packageDir = dir;
					break;
				}
			}
			dir = path.dirname(dir);
		}
		if (!packageDir!) return null;
	} catch {
		return null;
	}

	const packageJson = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf-8'));

	const typesEntry = packageJson.types || packageJson.typings;
	if (typesEntry) {
		return path.join(packageDir, path.dirname(typesEntry));
	}

	const distTypesPath = path.join(packageDir, 'dist', 'types');
	if (fs.existsSync(distTypesPath)) return distTypesPath;

	return null;
}

/**
 * Strip @example blocks from JSDoc comments.
 */
function stripExamples(content: string): string {
	return content.replace(/@example[\s\S]*?(?=\s*\*\s*@[a-z]|\s*\*\/)/gi, '');
}

/**
 * Remove member declarations whose name starts with "$" or "_".
 *
 * Supported patterns:
 * - function $name(...): ...;
 * - function _name(...): ...;
 * - $name(...): ...;
 * - _name(...): ...;
 * - $name?: (...args) => ...;
 * - _name?: (...args) => ...;
 * - $name?: SomeType;
 * - _name!: SomeType;
 * - static $name = ...;
 */
function filterDisallowedPrefixedMembers(content: string): ContentFilterResult {
	const patterns = [
		// function declarations
		/^[ \t]*(?:export\s+)?(?:declare\s+)?function\s+[$_][A-Za-z0-9_$]*\s*(?:<[^>{;]*>\s*)?\(/gm,
		// method signatures
		/^[ \t]*(?:(?:public|private|protected|static|abstract|readonly|declare|async)\s+)*[$_][A-Za-z0-9_$]*\??\s*(?:<[^>{;]*>\s*)?\(/gm,
		// callable property signatures
		/^[ \t]*(?:(?:public|private|protected|static|abstract|readonly|declare)\s+)*[$_][A-Za-z0-9_$]*\??\s*:\s*(?:<[^>{;]*>\s*)?\(/gm,
		// typed field/property declarations (covers class variables and similar members)
		/^[ \t]*(?:(?:public|private|protected|static|abstract|readonly|declare)\s+)*[$_][A-Za-z0-9_$]*\??\s*!?\s*:/gm,
		// initialized field/property declarations
		/^[ \t]*(?:(?:public|private|protected|static|abstract|readonly|declare)\s+)*[$_][A-Za-z0-9_$]*\??\s*!?\s*=/gm,
	];

	const ranges: Range[] = [];

	for (const pattern of patterns) {
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(content)) !== null) {
			const start = match.index;
			const end = findDeclarationEnd(content, start);
			if (end > start) {
				ranges.push({ start, end });
			}
		}
	}

	if (ranges.length === 0) {
		return { content, removedCount: 0 };
	}

	const mergedRanges = mergeRanges(ranges);
	let filtered = content;

	for (let index = mergedRanges.length - 1; index >= 0; index--) {
		const range = mergedRanges[index];
		filtered = filtered.slice(0, range.start) + filtered.slice(range.end);
	}

	return { content: filtered, removedCount: mergedRanges.length };
}

function mergeRanges(ranges: Range[]): Range[] {
	const sorted = [...ranges].sort((a, b) => a.start - b.start);
	const merged: Range[] = [sorted[0]];

	for (let index = 1; index < sorted.length; index++) {
		const current = sorted[index];
		const last = merged[merged.length - 1];

		if (current.start <= last.end) {
			last.end = Math.max(last.end, current.end);
		} else {
			merged.push({ ...current });
		}
	}

	return merged;
}

function findDeclarationEnd(content: string, start: number): number {
	let index = start;
	let parenDepth = 0;
	let bracketDepth = 0;
	let braceDepth = 0;
	let angleDepth = 0;

	while (index < content.length) {
		const char = content[index];
		const nextChar = index + 1 < content.length ? content[index + 1] : '';

		if (char === '/' && nextChar === '/') {
			index += 2;
			while (index < content.length && content[index] !== '\n') {
				index++;
			}
			continue;
		}

		if (char === '/' && nextChar === '*') {
			index += 2;
			while (index + 1 < content.length && !(content[index] === '*' && content[index + 1] === '/')) {
				index++;
			}
			index += 2;
			continue;
		}

		if (char === '"' || char === "'" || char === '`') {
			const quote = char;
			index++;
			while (index < content.length) {
				if (content[index] === '\\') {
					index += 2;
					continue;
				}
				if (content[index] === quote) {
					index++;
					break;
				}
				index++;
			}
			continue;
		}

		if (char === '(') parenDepth++;
		else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
		else if (char === '[') bracketDepth++;
		else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
		else if (char === '{') braceDepth++;
		else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
		else if (char === '<') angleDepth++;
		else if (char === '>') angleDepth = Math.max(0, angleDepth - 1);

		if (char === ';' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0 && angleDepth === 0) {
			return index + 1;
		}

		index++;
	}

	return start;
}

// ============================================================================
// Main
// ============================================================================

function processConfig(config: TypeGenerationConfig) {
	console.log(`\n🚀 Processing configuration: ${config.id}`);

	const fileContents: Map<string, { virtualPath: string; content: string }> = new Map();

	// Collect all declaration files while preserving module augmentations.
	for (const lib of config.libraries) {
		const typesDir = getTypesDir(lib.name);
		if (!typesDir) {
			console.warn(`⚠️ Could not find types for ${lib.name}`);
			continue;
		}

		console.log(`📦 ${lib.name} -> ${typesDir}`);
		const files = findAllDtsFiles(typesDir);
		console.log(`   Found ${files.length} files`);

		for (const filePath of files) {
			const fullPathNormalized = filePath.replace(/\\/g, '/');
			const nodeModulesIndex = fullPathNormalized.lastIndexOf('node_modules/');
			const relativePathInNodeModules =
				nodeModulesIndex === -1
					? `${lib.name}/dist/types/${path.relative(typesDir, filePath).replace(/\\/g, '/')}`
					: fullPathNormalized.substring(nodeModulesIndex + 'node_modules/'.length);
			const virtualPath = `file:///node_modules/${relativePathInNodeModules}`;

			let content = fs.readFileSync(filePath, 'utf-8');

			// Strip @example blocks
			content = stripExamples(content);

			// Normalize inline JSDoc links for Monaco hover/completion rendering
			content = normalizeJSDocLinks(content);

			// Remove $- and _-prefixed members from source types
			const filtered = filterDisallowedPrefixedMembers(content);
			content = filtered.content;

			fileContents.set(filePath, { virtualPath, content });
		}
	}

	const outputMap: Record<string, string> = {};

	for (const [, { virtualPath, content }] of fileContents) {
		let processedContent = content;

		// Clean up any excessive whitespace
		processedContent = processedContent.replace(/\n{3,}/g, '\n\n').trim();

		outputMap[virtualPath] = processedContent;
	}

	// Generate minimal globals.d.ts if requested
	if (config.includeGlobals) {
		const globalsContent = generateGlobalsContent();
		outputMap['file:///src/live/globals.d.ts'] = globalsContent;
	}

	const timestamp = new Date().toISOString();

	// Create the final output file content
	const fileContent = `/**
 * AUTO-GENERATED TYPE DEFINITIONS FOR MONACO INTELLISENSE
 * Generated: ${timestamp}
 * Config ID: ${config.id}
 * 
	 * This file contains:
	 * - All .d.ts files from: ${config.libraries.map((l) => l.name).join(', ')}
	 * - Package module augmentations preserved for TypeScript declaration merging
	 * ${config.includeGlobals ? '- Minimal global declarations for the live coding environment' : ''}
	 */

export const typeDefinitions: Record<string, string> = ${JSON.stringify(outputMap, null, 2)};
`;

	const outputDir = path.dirname(config.output);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	fs.writeFileSync(config.output, fileContent, 'utf-8');
	console.log(`\n✅ Generated ${config.output} (${(fileContent.length / 1024).toFixed(1)} KB)`);
}

function main() {
	console.log('🔍 Extracting library types...\n');

	for (const config of CONFIGS) {
		try {
			processConfig(config);
		} catch (error) {
			console.error(`❌ Failed to process config ${config.id}:`, error);
		}
	}
}

main();
