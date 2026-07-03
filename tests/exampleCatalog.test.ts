import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
	EXAMPLE_LIBRARY_ORDER,
	getExampleLibraryCatalog,
} from '../src/features/examples/model/exampleCatalog';
import type { Example, ExampleLibraryCatalog } from '../src/features/examples/types';
import { typeDefinitions } from '../src/textmode/config/generatedTypes';

const REQUESTED_LIBRARY_ORDER = ['textmode', 'synth', 'figlet', 'filters', 'export'] as const;
const BLOCKED_EXPORT_DOWNLOAD_CALLS = [
	'saveCanvas',
	'copyCanvas',
	'saveSVG',
	'saveStrings',
	'saveJSON',
	'saveGIF',
	'saveVideo',
];

describe('example catalog', () => {
	it('keeps the requested library tab order', () => {
		expect(EXAMPLE_LIBRARY_ORDER).toEqual(REQUESTED_LIBRARY_ORDER);
		expect(getExampleLibraryCatalog().map((library) => library.id)).toEqual(REQUESTED_LIBRARY_ORDER);
	});

	it('provides every requested library with categories and examples', () => {
		for (const library of getExampleLibraryCatalog()) {
			expect(library.displayName).toMatch(/^textmode(\.|$)/);
			expect(library.categories.length).toBeGreaterThan(0);

			for (const category of library.categories) {
				expect(category.id).toBeTruthy();
				expect(category.displayName).toBeTruthy();
				expect(category.examples.length).toBeGreaterThan(0);
			}
		}
	});

	it('uses unique stable example IDs and non-empty code strings', () => {
		const examples = flattenExamples(getExampleLibraryCatalog());
		const ids = examples.map(({ example }) => example.id);

		expect(new Set(ids).size).toBe(ids.length);

		for (const { example } of examples) {
			expect(example.id).toMatch(/^[a-z0-9-]+$/);
			expect(example.code.trim().length).toBeGreaterThan(0);
		}
	});
});

describe('example code safety', () => {
	it('parses each example with the same async wrapper shape as the runner', () => {
		for (const { library, example } of flattenExamples(getExampleLibraryCatalog())) {
			expect(() => new Function(wrapUserCode(example.code)), `${library.id}/${example.id}`).not.toThrow();
		}
	});

	it('typechecks each example against the live editor declarations', () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textmode-example-types-'));

		try {
			const declarationPaths = materializeGeneratedTypeDefinitions(tempDir);

			for (const { library, example } of flattenExamples(getExampleLibraryCatalog())) {
				const sourcePath = path.join(tempDir, `example-${example.id}.js`);
				fs.writeFileSync(sourcePath, wrapUserCodeForTypecheck(example.code), 'utf8');

				const service = createLanguageService([sourcePath, ...declarationPaths], tempDir);
				const diagnostics = [
					...service.getSyntacticDiagnostics(sourcePath),
					...service.getSemanticDiagnostics(sourcePath),
				];

				expect(formatDiagnostics(diagnostics), `${library.id}/${example.id}`).toEqual([]);
			}
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it('does not include local runtime creation or plugin installation boilerplate', () => {
		for (const { example } of flattenExamples(getExampleLibraryCatalog())) {
			expect(example.code).not.toMatch(/\btextmode\.create\s*\(/);
			expect(example.code).not.toMatch(/\bplugins\s*:/);
			expect(example.code).not.toMatch(/\b(?:FigletPlugin|FiltersPlugin|ExportPlugin)\b/);
		}
	});

	it('keeps export examples non-destructive and download-free', () => {
		const exportLibrary = getExampleLibraryCatalog().find((library) => library.id === 'export');
		const exportExamples = exportLibrary ? flattenExamples([exportLibrary]) : [];

		for (const { example } of exportExamples) {
			for (const methodName of BLOCKED_EXPORT_DOWNLOAD_CALLS) {
				expect(example.code, example.id).not.toMatch(new RegExp(`\\bt\\.${methodName}\\s*\\(`));
			}
		}
	});
});

function flattenExamples(catalog: ExampleLibraryCatalog[]): Array<{ library: ExampleLibraryCatalog; example: Example }> {
	return catalog.flatMap((library) =>
		library.categories.flatMap((category) => category.examples.map((example) => ({ library, example })))
	);
}

function wrapUserCode(code: string): string {
	return `"use strict";\nreturn (async () => {\n${code}\n})();`;
}

function wrapUserCodeForTypecheck(code: string): string {
	return `"use strict";\n(async () => {\n${code}\n})();`;
}

function createLanguageService(scriptFileNames: string[], cwd: string): ts.LanguageService {
	const compilerOptions: ts.CompilerOptions = {
		allowJs: true,
		checkJs: true,
		noEmit: true,
		strict: false,
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
	return diagnostics.map((diagnostic) => {
		const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
		const file = diagnostic.file;

		if (!file || diagnostic.start === undefined) {
			return message;
		}

		const { line, character } = file.getLineAndCharacterOfPosition(diagnostic.start);
		return `${path.basename(file.fileName)}:${line + 1}:${character + 1} ${message}`;
	});
}
