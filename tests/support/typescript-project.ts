import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as ts from 'typescript';

export interface TemporaryTypeScriptProject {
	readonly root: string;
	write(relativePath: string, content: string): string;
	materializeVirtualFiles(files: Record<string, string>): string[];
	createLanguageService(scriptFileNames: string[]): ts.LanguageService;
	formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string[];
}

export function withTypeScriptProject<T>(prefix: string, run: (project: TemporaryTypeScriptProject) => T): T {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	const project = createProject(root);

	try {
		return run(project);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}

function createProject(root: string): TemporaryTypeScriptProject {
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
		baseUrl: root,
		paths: {
			'textmode.js': ['node_modules/textmode.js/dist/types/index.d.ts'],
			'textmode.js/addon': ['node_modules/textmode.js/dist/types/exports/addon.d.ts'],
			'textmode.synth.js': ['node_modules/textmode.synth.js/dist/types/index.d.ts'],
			'textmode.filters.js': ['node_modules/textmode.filters.js/dist/types/index.d.ts'],
			'textmode.export.js': ['node_modules/textmode.export.js/dist/types/index.d.ts'],
			'textmode.figlet.js': ['node_modules/textmode.figlet.js/dist/types/index.d.ts'],
		},
	};

	const write = (relativePath: string, content: string): string => {
		const filePath = path.join(root, relativePath);
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, content, 'utf8');
		return filePath;
	};

	return {
		root,
		write,
		materializeVirtualFiles(files) {
			return Object.entries(files).map(([virtualPath, content]) =>
				write(virtualPath.replace(/^file:\/\/\//, ''), content)
			);
		},
		createLanguageService(scriptFileNames) {
			const host: ts.LanguageServiceHost = {
				getCompilationSettings: () => compilerOptions,
				getCurrentDirectory: () => root,
				getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
				getDirectories: ts.sys.getDirectories,
				getScriptFileNames: () => scriptFileNames,
				getScriptSnapshot: (fileName) =>
					fs.existsSync(fileName)
						? ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, 'utf8'))
						: undefined,
				getScriptVersion: () => '0',
				readDirectory: ts.sys.readDirectory,
				readFile: (fileName) => (fs.existsSync(fileName) ? fs.readFileSync(fileName, 'utf8') : undefined),
				fileExists: fs.existsSync,
				directoryExists: ts.sys.directoryExists,
				resolveModuleNames: (moduleNames, containingFile) =>
					moduleNames.map(
						(moduleName) =>
							ts.resolveModuleName(moduleName, containingFile, compilerOptions, ts.sys).resolvedModule
					),
			};

			return ts.createLanguageService(host);
		},
		formatDiagnostics(diagnostics) {
			return diagnostics.map((diagnostic) => {
				const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
				if (!diagnostic.file || diagnostic.start === undefined) return message;

				const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
				return `${path.basename(diagnostic.file.fileName)}:${line + 1}:${character + 1} ${message}`;
			});
		},
	};
}
