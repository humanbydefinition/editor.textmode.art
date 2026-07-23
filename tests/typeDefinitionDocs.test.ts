import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { normalizeJSDocLinks } from '../scripts/lib/normalizeJSDocLinks.js';
import { typeDefinitions } from '../src/textmode/config/generatedTypes';

const TEXTMODE_LAYER_PATH = 'file:///node_modules/textmode.js/dist/types/textmode/layers/TextmodeLayer.d.ts';
const FILTERS_INDEX_PATH = 'file:///node_modules/textmode.filters.js/dist/types/index.d.ts';
const FIGLET_AUGMENTATION_PATH = 'file:///node_modules/textmode.figlet.js/dist/types/augmentations/textmode.d.ts';
const EXPORT_AUGMENTATION_PATH = 'file:///node_modules/textmode.export.js/dist/types/augmentations/textmode.d.ts';

describe('generated type definition docs', () => {
	it('contains normalized external API reference links in extracted output', () => {
		const textmodeLayerTypes = typeDefinitions[TEXTMODE_LAYER_PATH];

		expect(textmodeLayerTypes).toContain(
			'[layering.TextmodeLayer.draw API reference](https://code.textmode.art/api/textmode.js/namespaces/layering/classes/TextmodeLayer/methods/draw)'
		);
		expect(textmodeLayerTypes).not.toContain(
			'{@link https://code.textmode.art/api/textmode.js/namespaces/layering/classes/TextmodeLayer/methods/draw | layering.TextmodeLayer.draw API reference}'
		);
	});

	it('contains normalized internal links in extracted output', () => {
		const filtersIndexTypes = typeDefinitions[FILTERS_INDEX_PATH];

		expect(filtersIndexTypes).toContain('* - `brightness` - Adjust image brightness');
		expect(filtersIndexTypes).not.toContain('{@link BrightnessOptions | brightness}');
	});

	it('preserves add-on module augmentations for semantic declaration merging', () => {
		expect(typeDefinitions[FIGLET_AUGMENTATION_PATH]).toContain("declare module 'textmode.js'");
		expect(typeDefinitions[FIGLET_AUGMENTATION_PATH]).toContain(
			'interface Textmodifier extends TextmodifierFigletExtensions'
		);
		expect(typeDefinitions[EXPORT_AUGMENTATION_PATH]).toContain("declare module 'textmode.js'");
		expect(typeDefinitions[EXPORT_AUGMENTATION_PATH]).toContain('interface Textmodifier extends TextmodeExportAPI');
	});
});

describe('TypeScript language service docs', () => {
	it('exposes normalized markdown and plain text instead of raw JSDoc link syntax', () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textmode-doc-links-'));

		try {
			const declarationPath = path.join(tempDir, 'pkg.d.ts');
			const sourcePath = path.join(tempDir, 'test.js');
			const declarationSource = normalizeJSDocLinks(
				`
export declare class Demo {
	/**
	 * Uses {@link other}.
	 * @deprecated Prefer {@link newer}.
	 * @see {@link https://example.com/docs | Demo.docs API reference}
	 */
	docs(): void;

	/**
	 * Another method.
	 */
	other(): void;

	/**
	 * Replacement method.
	 */
	newer(): void;
}
`.trimStart()
			);
			const source = "import { Demo } from './pkg';\nDemo.prototype.docs;\n";

			fs.writeFileSync(declarationPath, declarationSource, 'utf8');
			fs.writeFileSync(sourcePath, source, 'utf8');

			const service = createLanguageService([sourcePath, declarationPath], tempDir);
			const quickInfo = service.getQuickInfoAtPosition(sourcePath, source.indexOf('docs') + 1);

			expect(quickInfo).toBeDefined();

			const documentation = flattenDisplayParts(quickInfo?.documentation);
			const seeTag = quickInfo?.tags?.find((tag) => tag.name === 'see');
			const deprecatedTag = quickInfo?.tags?.find((tag) => tag.name === 'deprecated');

			expect(documentation).toContain('Uses `other`.');
			expect(documentation).not.toContain('{@link');
			expect(flattenDisplayParts(seeTag?.text)).toContain('[Demo.docs API reference](https://example.com/docs)');
			expect(flattenDisplayParts(deprecatedTag?.text)).toContain('Prefer `newer`.');
			expect(flattenDisplayParts(seeTag?.text)).not.toContain('{@link');
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});
});

describe('TypeScript language service add-on support', () => {
	it('exposes bundled add-on imports, globals, and Textmodifier augmentations', () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textmode-addon-types-'));

		try {
			const declarationPaths = materializeGeneratedTypeDefinitions(tempDir);
			const sourcePath = path.join(tempDir, 'sketch.js');
			const source = `
import { TextmodeFigFont } from 'textmode.figlet.js';
import { ExportPlugin } from 'textmode.export.js';

t.layers.base.synth(noise().rotate(0.2));
t.figText('HELLO', 0, 0);
t.loadFigFont('/fonts/slant.flf').then((font) => t.figFont(font));
t.figTextAlign('center');
void t.saveCanvas({ format: 'png' });
void t.copyCanvas({ format: 'png' });
t.exportOverlay.show();
void t.saveGIF({ frameCount: 12 });

const figFontConstructor = TextmodeFigFont;
const exportPlugin = ExportPlugin;
const filtersPlugin = FiltersPlugin;
const figletPlugin = FigletPlugin;
const globalFigFontConstructor = TextmodeFigFont;
`.trimStart();

			fs.writeFileSync(sourcePath, source, 'utf8');

			const service = createLanguageService([sourcePath, ...declarationPaths], tempDir);
			const diagnostics = service.getSemanticDiagnostics(sourcePath);

			expect(formatDiagnostics(diagnostics)).toEqual([]);
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});
});

function flattenDisplayParts(parts: readonly ts.SymbolDisplayPart[] | string | undefined): string {
	if (!parts) {
		return '';
	}

	if (typeof parts === 'string') {
		return parts;
	}

	return parts.map((part) => part.text).join('');
}

function createLanguageService(scriptFileNames: string[], cwd: string): ts.LanguageService {
	const compilerOptions: ts.CompilerOptions = {
		allowJs: true,
		checkJs: true,
		noEmit: true,
		target: ts.ScriptTarget.ES2020,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.NodeJs,
		lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
		types: [],
		baseUrl: cwd,
		paths: {
			'textmode.js': ['node_modules/textmode.js/dist/types/index.d.ts'],
			'textmode.synth.js': ['node_modules/textmode.synth.js/dist/types/index.d.ts'],
			'textmode.filters.js': ['node_modules/textmode.filters.js/dist/types/index.d.ts'],
			'textmode.export.js': ['node_modules/textmode.export.js/dist/types/index.d.ts'],
			'textmode.figlet.js': ['node_modules/textmode.figlet.js/dist/types/index.d.ts'],
		},
	};

	const host: ts.LanguageServiceHost = {
		getCompilationSettings: () => compilerOptions,
		getCurrentDirectory: () => cwd,
		getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
		getDirectories: ts.sys.getDirectories,
		getScriptFileNames: () => scriptFileNames,
		getScriptSnapshot: (fileName) => {
			if (!fs.existsSync(fileName)) {
				return undefined;
			}

			return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, 'utf8'));
		},
		getScriptVersion: () => '0',
		readDirectory: ts.sys.readDirectory,
		readFile: (fileName) => {
			if (!fs.existsSync(fileName)) {
				return undefined;
			}

			return fs.readFileSync(fileName, 'utf8');
		},
		fileExists: fs.existsSync,
		directoryExists: ts.sys.directoryExists,
		resolveModuleNames: (moduleNames, containingFile) =>
			moduleNames.map(
				(moduleName) => ts.resolveModuleName(moduleName, containingFile, compilerOptions, ts.sys).resolvedModule
			),
	};

	return ts.createLanguageService(host);
}

function materializeGeneratedTypeDefinitions(tempDir: string): string[] {
	const paths: string[] = [];

	for (const [virtualPath, content] of Object.entries(typeDefinitions)) {
		const relativePath = virtualPath.replace(/^file:\/\/\//, '');
		const realPath = path.join(tempDir, relativePath);
		fs.mkdirSync(path.dirname(realPath), { recursive: true });
		fs.writeFileSync(realPath, content, 'utf8');
		paths.push(realPath);
	}

	return paths;
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string[] {
	return diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}
