/**
 * Type Extraction Script for Monaco IntelliSense
 *
 * This script extracts ALL .d.ts files from specified libraries and bundles them
 * into a JSON map of "file path" -> "content".
 *
 * Key features:
 * - Preserves module structure for internal imports to work correctly
 * - Automatically detects module augmentations (declare module 'X' { ... })
 * - INJECTS augmented members directly into original type definitions
 * - Generates a minimal globals.d.ts for live coding environment
 * - Strips @example blocks to reduce bundle size
 * - Excludes $- and _-prefixed callable declarations (e.g. $foo, _bar)
 */
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

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
            { name: 'textmode.filters.js' }
        ],
        output: 'src/textmode/config/generatedTypes.ts',
        includeGlobals: true
    }
];

// ============================================================================
// Types for Augmentation Tracking
// ============================================================================

interface InterfaceAugmentation {
    members: string;  // The raw interface body content
}

interface ContentFilterResult {
    content: string;
    removedCount: number;
}

// Map: moduleName -> interfaceName -> augmentation info
type AugmentationMap = Map<string, Map<string, InterfaceAugmentation>>;

interface Range {
    start: number;
    end: number;
}

// ============================================================================
// Augmentation Parsing
// ============================================================================

/**
 * Parse and extract module augmentations from file content.
 * Returns the augmentations found and the content with augmentation blocks removed.
 */
function extractAugmentations(content: string, augmentations: AugmentationMap): string {
    // Regex to match: declare module 'module-name' { ... }
    const declareModuleRegex = /declare\s+module\s+['"]([^'"]+)['"]\s*\{/g;

    let result = content;
    let match: RegExpExecArray | null;
    const blocksToRemove: { start: number; end: number }[] = [];

    // Find all declare module blocks
    while ((match = declareModuleRegex.exec(content)) !== null) {
        const moduleName = match[1];
        const blockStart = match.index;
        const braceStart = match.index + match[0].length - 1;

        // Find the matching closing brace
        let braceDepth = 1;
        let pos = braceStart + 1;

        while (pos < content.length && braceDepth > 0) {
            if (content[pos] === '{') braceDepth++;
            else if (content[pos] === '}') braceDepth--;
            pos++;
        }

        const blockEnd = pos;
        const blockContent = content.substring(braceStart + 1, blockEnd - 1);

        // Extract interface declarations from this block
        extractInterfacesFromBlock(moduleName, blockContent, augmentations);

        // Mark this block for removal
        blocksToRemove.push({ start: blockStart, end: blockEnd });
    }

    // Remove blocks in reverse order to preserve positions
    blocksToRemove.sort((a, b) => b.start - a.start);
    for (const block of blocksToRemove) {
        result = result.substring(0, block.start) + result.substring(block.end);
    }

    return result;
}

/**
 * Extract interface declarations from a module augmentation block.
 */
function extractInterfacesFromBlock(
    moduleName: string,
    blockContent: string,
    augmentations: AugmentationMap
): void {
    // Regex to match interface declarations with optional JSDoc
    const interfaceRegex = /(\/\*\*[\s\S]*?\*\/\s*)?\binterface\s+(\w+)\s*\{/g;

    let match: RegExpExecArray | null;

    while ((match = interfaceRegex.exec(blockContent)) !== null) {
        const jsdoc = match[1] || '';
        const interfaceName = match[2];
        const braceStart = match.index + match[0].length - 1;

        // Find matching closing brace
        let braceDepth = 1;
        let pos = braceStart + 1;

        while (pos < blockContent.length && braceDepth > 0) {
            if (blockContent[pos] === '{') braceDepth++;
            else if (blockContent[pos] === '}') braceDepth--;
            pos++;
        }

        // Include JSDoc with the interface body
        const interfaceBodyRaw = jsdoc + blockContent.substring(braceStart + 1, pos - 1).trim();
        const interfaceBody = filterDisallowedPrefixedMembers(interfaceBodyRaw).content;

        // Store the augmentation
        if (!augmentations.has(moduleName)) {
            augmentations.set(moduleName, new Map());
        }

        const moduleAugs = augmentations.get(moduleName)!;

        if (moduleAugs.has(interfaceName)) {
            // Merge with existing augmentation
            const existing = moduleAugs.get(interfaceName)!;
            existing.members += '\n' + interfaceBody;
        } else {
            moduleAugs.set(interfaceName, {
                members: interfaceBody
            });
        }
    }
}

// ============================================================================
// Type Injection
// ============================================================================

/**
 * Inject augmented members into interface/class declarations.
 * Finds matching interface/class declarations and inserts new members.
 */
function injectAugmentations(
    content: string,
    interfaceAugs: Map<string, InterfaceAugmentation>
): string {
    let result = content;

    for (const [interfaceName, aug] of interfaceAugs) {
        // Find interface or class declaration
        // Match: "interface InterfaceName" or "export interface InterfaceName" 
        // or "declare class ClassName" or "export declare class ClassName"
        const patterns = [
            new RegExp(`(export\\s+)?interface\\s+${interfaceName}\\s*(extends[^{]*)?\\{`, 'g'),
            new RegExp(`(export\\s+)?(declare\\s+)?class\\s+${interfaceName}\\s*(extends[^{]*)?(implements[^{]*)?\\{`, 'g')
        ];

        for (const pattern of patterns) {
            let match: RegExpExecArray | null;

            while ((match = pattern.exec(result)) !== null) {
                const openBracePos = match.index + match[0].length - 1;

                // Find the closing brace of this interface/class
                let braceDepth = 1;
                let pos = openBracePos + 1;

                while (pos < result.length && braceDepth > 0) {
                    if (result[pos] === '{') braceDepth++;
                    else if (result[pos] === '}') braceDepth--;
                    pos++;
                }

                const closingBracePos = pos - 1;

                // Clean up the augmented members
                const cleanedMembers = stripExamples(aug.members);
                const formattedMembers = '\n    // Injected from textmode.synth.js\n' +
                    indentContent(cleanedMembers, 4) + '\n';

                // Inject members before the closing brace
                result = result.substring(0, closingBracePos) +
                    formattedMembers +
                    result.substring(closingBracePos);

                // Only inject once per interface name
                break;
            }
        }
    }

    return result;
}

// ============================================================================
// Global Declaration Generation
// ============================================================================

/**
 * Generate a minimal globals.d.ts for the live coding environment.
 * Uses original type names since augmentations are now injected directly.
 */
function generateGlobalsContent(): string {
    return `import { Textmodifier } from 'textmode.js';
import { SynthSource, SynthParameterValue, EasingFunction } from 'textmode.synth.js';

declare global {
  // Main Textmode Instance
  const t: Textmodifier;

  // Cleanup
  function onDispose(fn: () => void): void;
  
  // Tracked Timers (overridden from window for resource tracking)
  function setTimeout(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;
  function clearTimeout(id?: number): void;
  function setInterval(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;
  function clearInterval(id?: number): void;
  function requestAnimationFrame(callback: FrameRequestCallback): number;
  function cancelAnimationFrame(id: number): void;
  function addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

  // Synth Source Functions (re-exported as globals)
  function osc(frequency?: SynthParameterValue, sync?: SynthParameterValue, offset?: SynthParameterValue): SynthSource;
  function noise(scale?: SynthParameterValue, offset?: SynthParameterValue): SynthSource;
  function gradient(speed?: SynthParameterValue): SynthSource;
  function solid(r?: SynthParameterValue, g?: SynthParameterValue, b?: SynthParameterValue, a?: SynthParameterValue): SynthSource;
  function shape(sides?: SynthParameterValue, radius?: SynthParameterValue, smoothing?: SynthParameterValue): SynthSource;
  function src(layer?: { id?: string }): SynthSource;
  function char(source: SynthSource, charCount?: number): SynthSource;
  function voronoi(scale?: SynthParameterValue, speed?: SynthParameterValue, blending?: SynthParameterValue): SynthSource;
  function charColor(source: SynthSource, color: SynthSource): SynthSource;
  function cellColor(source: SynthSource, color: SynthSource): SynthSource;
  function paint(source: SynthSource): SynthSource;

  
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
 * Indent content by a specified number of spaces.
 */
function indentContent(content: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return content
        .split('\n')
        .map(line => line.trim() ? indent + line : line)
        .join('\n');
}

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
    return content.replace(
        /@example[\s\S]*?(?=\s*\*\s*@[a-z]|\s*\*\/)/gi,
        ''
    );
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
        /^[ \t]*(?:(?:public|private|protected|static|abstract|readonly|declare)\s+)*[$_][A-Za-z0-9_$]*\??\s*:\s*(?:<[^>{;]*>\s*)?\(/gm
        ,
        // typed field/property declarations (covers class variables and similar members)
        /^[ \t]*(?:(?:public|private|protected|static|abstract|readonly|declare)\s+)*[$_][A-Za-z0-9_$]*\??\s*!?\s*:/gm,
        // initialized field/property declarations
        /^[ \t]*(?:(?:public|private|protected|static|abstract|readonly|declare)\s+)*[$_][A-Za-z0-9_$]*\??\s*!?\s*=/gm
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

        if (char === '"' || char === '\'' || char === '`') {
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

    const augmentations: AugmentationMap = new Map();
    const fileContents: Map<string, { virtualPath: string; content: string; lib: string }> = new Map();

    // First pass: collect all files and extract augmentations
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

            if (nodeModulesIndex === -1) continue;

            const relativePathInNodeModules = fullPathNormalized.substring(nodeModulesIndex + 'node_modules/'.length);
            const virtualPath = `file:///node_modules/${relativePathInNodeModules}`;

            let content = fs.readFileSync(filePath, 'utf-8');

            // Extract augmentations and remove them from content
            content = extractAugmentations(content, augmentations);

            // Strip @example blocks
            content = stripExamples(content);

            // Remove $- and _-prefixed members from source types
            const filtered = filterDisallowedPrefixedMembers(content);
            content = filtered.content;

            // Store for second pass
            fileContents.set(filePath, { virtualPath, content, lib: lib.name });
        }
    }

    // Log discovered augmentations
    console.log('\n📝 Discovered module augmentations:');
    for (const [moduleName, interfaces] of augmentations) {
        console.log(`   ${moduleName}:`);
        for (const [interfaceName, aug] of interfaces) {
            const memberCount = (aug.members.match(/\b[A-Za-z][A-Za-z0-9_]*\s*\(/g) || []).length;
            console.log(`      - ${interfaceName} (${memberCount} method(s))`);
        }
    }

    // Second pass: inject augmentations into target files
    const outputMap: Record<string, string> = {};

    for (const [filePath, { virtualPath, content, lib }] of fileContents) {
        let processedContent = content;

        // Collect augmentations from all module names that belong to this library.
        // Augmentation keys can be the exact library name (e.g. 'textmode.js')
        // or subpath exports (e.g. 'textmode.js/layering'), so we match both.
        const mergedAugs = new Map<string, InterfaceAugmentation>();
        for (const [moduleName, interfaces] of augmentations) {
            if (moduleName === lib || moduleName.startsWith(lib + '/')) {
                for (const [ifaceName, aug] of interfaces) {
                    if (mergedAugs.has(ifaceName)) {
                        mergedAugs.get(ifaceName)!.members += '\n' + aug.members;
                    } else {
                        mergedAugs.set(ifaceName, { members: aug.members });
                    }
                }
            }
        }

        if (mergedAugs.size > 0) {
            const before = processedContent.length;
            processedContent = injectAugmentations(processedContent, mergedAugs);
            const after = processedContent.length;
            if (before !== after) {
                console.log(`   💉 Injected augmentations into ${path.basename(filePath)} (${after - before} chars added)`);
            }
        }

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
 * - All .d.ts files from: ${config.libraries.map(l => l.name).join(', ')}
 * - Augmented methods INJECTED directly into original type definitions
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
    console.log('🔍 Extracting library types with direct injection...\n');

    for (const config of CONFIGS) {
        try {
            processConfig(config);
        } catch (error) {
            console.error(`❌ Failed to process config ${config.id}:`, error);
        }
    }
}

main();
