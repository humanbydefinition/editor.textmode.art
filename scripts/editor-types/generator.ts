import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { EDITOR_TYPES_CONFIG } from './config.js';
import { transformDeclaration } from './declaration-transform.js';
import { LIVE_GLOBALS_CONTENT } from './live-globals.js';

const DECLARATION_FILE_PATTERN = /\.d\.(?:ts|mts|cts)$/;

interface PackageManifest {
	name?: unknown;
	version?: unknown;
}

interface ResolvedPackage {
	name: string;
	version: string;
	rootPath: string;
	declarationRootPath: string;
}

export interface EditorTypesGenerationResult {
	outputPath: string;
	status: 'written' | 'unchanged';
	packageCount: number;
	declarationFileCount: number;
	removedDeclarationCount: number;
	byteLength: number;
}

export async function generateEditorTypes(options: { projectRoot: string }): Promise<EditorTypesGenerationResult> {
	const projectRoot = path.resolve(options.projectRoot);
	const outputPath = path.resolve(projectRoot, EDITOR_TYPES_CONFIG.outputPath);
	const virtualFiles = new Map<string, string>();
	const resolvedPackages: ResolvedPackage[] = [];
	let declarationFileCount = 0;
	let removedDeclarationCount = 0;

	for (const packageName of EDITOR_TYPES_CONFIG.packages) {
		const resolvedPackage = await resolvePackage(projectRoot, packageName);
		resolvedPackages.push(resolvedPackage);
		const declarationPaths = await findDeclarationFiles(resolvedPackage.declarationRootPath);
		if (declarationPaths.length === 0) {
			throw generationError(
				'discovery',
				packageName,
				resolvedPackage.declarationRootPath,
				'declaration root contains no declaration files'
			);
		}

		for (const declarationPath of declarationPaths) {
			const virtualPath = createVirtualPath(resolvedPackage, declarationPath);
			if (virtualFiles.has(virtualPath)) {
				throw generationError(
					'discovery',
					packageName,
					declarationPath,
					`duplicate virtual path ${virtualPath}`
				);
			}

			try {
				const source = await readFile(declarationPath, 'utf8');
				const transformed = transformDeclaration(declarationPath, source);
				virtualFiles.set(virtualPath, transformed.content);
				declarationFileCount++;
				removedDeclarationCount += transformed.removedDeclarationCount;
			} catch (error) {
				throw generationError(
					'transform',
					packageName,
					declarationPath,
					'could not transform declaration',
					error
				);
			}
		}
	}

	if (virtualFiles.has(EDITOR_TYPES_CONFIG.globalsVirtualPath)) {
		throw generationError(
			'assembly',
			'live globals',
			EDITOR_TYPES_CONFIG.globalsVirtualPath,
			'duplicate virtual path'
		);
	}
	virtualFiles.set(EDITOR_TYPES_CONFIG.globalsVirtualPath, LIVE_GLOBALS_CONTENT);

	const fileContent = serializeGeneratedModule(virtualFiles, resolvedPackages);
	const existingContent = await readOptionalFile(outputPath);
	const status = existingContent === fileContent ? 'unchanged' : 'written';

	if (status === 'written') {
		await writeAtomically(outputPath, fileContent);
	}

	return {
		outputPath,
		status,
		packageCount: resolvedPackages.length,
		declarationFileCount,
		removedDeclarationCount,
		byteLength: Buffer.byteLength(fileContent),
	};
}

async function resolvePackage(projectRoot: string, packageName: string): Promise<ResolvedPackage> {
	const containingFile = path.join(projectRoot, '__editor_types_resolution__.ts');
	const resolution = ts.resolveModuleName(
		packageName,
		containingFile,
		{
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			resolvePackageJsonExports: true,
			resolvePackageJsonImports: true,
		},
		ts.sys
	).resolvedModule;

	if (!resolution) {
		throw generationError('resolution', packageName, projectRoot, 'TypeScript could not resolve the package');
	}
	if (!DECLARATION_FILE_PATTERN.test(resolution.resolvedFileName)) {
		throw generationError(
			'resolution',
			packageName,
			resolution.resolvedFileName,
			'resolved entry is not a TypeScript declaration file'
		);
	}

	const declarationEntryPath = await realpath(resolution.resolvedFileName);
	const { manifest, rootPath } = await findOwningPackage(packageName, declarationEntryPath);
	const declarationRootPath = path.dirname(declarationEntryPath);
	assertPathWithin(rootPath, declarationRootPath, packageName);

	if (typeof manifest.version !== 'string' || manifest.version.trim() === '') {
		throw generationError('manifest', packageName, path.join(rootPath, 'package.json'), 'version must be a string');
	}

	return {
		name: packageName,
		version: manifest.version,
		rootPath,
		declarationRootPath,
	};
}

async function findOwningPackage(
	packageName: string,
	declarationEntryPath: string
): Promise<{ manifest: PackageManifest; rootPath: string }> {
	let currentPath = path.dirname(declarationEntryPath);

	while (true) {
		const manifestPath = path.join(currentPath, 'package.json');
		try {
			const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PackageManifest;
			if (manifest.name === packageName) return { manifest, rootPath: currentPath };
		} catch (error) {
			if (!isFileNotFoundError(error)) {
				throw generationError('manifest', packageName, manifestPath, 'could not read package manifest', error);
			}
		}

		const parentPath = path.dirname(currentPath);
		if (parentPath === currentPath) break;
		currentPath = parentPath;
	}

	throw generationError('manifest', packageName, declarationEntryPath, 'could not find the owning package manifest');
}

async function findDeclarationFiles(directoryPath: string): Promise<string[]> {
	const entries = await readdir(directoryPath, { withFileTypes: true });
	entries.sort((left, right) => compareStrings(left.name, right.name));
	const declarationPaths: string[] = [];

	for (const entry of entries) {
		const entryPath = path.join(directoryPath, entry.name);
		if (entry.isDirectory() && entry.name !== 'node_modules') {
			declarationPaths.push(...(await findDeclarationFiles(entryPath)));
		} else if (entry.isFile() && DECLARATION_FILE_PATTERN.test(entry.name)) {
			declarationPaths.push(entryPath);
		}
	}

	return declarationPaths;
}

function createVirtualPath(resolvedPackage: ResolvedPackage, declarationPath: string): string {
	assertPathWithin(resolvedPackage.rootPath, declarationPath, resolvedPackage.name);
	const packageRelativePath = path.relative(resolvedPackage.rootPath, declarationPath);
	const portableRelativePath = packageRelativePath.split(path.sep).join('/');
	return `file:///node_modules/${resolvedPackage.name}/${portableRelativePath}`;
}

function assertPathWithin(rootPath: string, candidatePath: string, packageName: string): void {
	const relativePath = path.relative(rootPath, candidatePath);
	if (
		relativePath === '' ||
		(!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath))
	) {
		return;
	}
	throw generationError('resolution', packageName, candidatePath, 'declaration path escapes its package root');
}

function serializeGeneratedModule(
	virtualFiles: ReadonlyMap<string, string>,
	resolvedPackages: readonly ResolvedPackage[]
): string {
	const outputMap = Object.fromEntries(
		[...virtualFiles.entries()].sort(([left], [right]) => compareStrings(left, right))
	);
	const sources = resolvedPackages.map(({ name, version }) => `${name}@${version}`).join(', ');

	return `/**
 * AUTO-GENERATED TYPE DEFINITIONS FOR MONACO INTELLISENSE
 * Sources: ${sources}
 *
 * Generated by scripts/editor-types/cli.ts. Do not edit this file directly.
 */

export const typeDefinitions: Record<string, string> = ${JSON.stringify(outputMap, null, 2)};
`;
}

async function readOptionalFile(filePath: string): Promise<string | null> {
	try {
		return await readFile(filePath, 'utf8');
	} catch (error) {
		if (isFileNotFoundError(error)) return null;
		throw generationError('read output', 'editor types', filePath, 'could not read existing output', error);
	}
}

async function writeAtomically(outputPath: string, content: string): Promise<void> {
	const outputDirectory = path.dirname(outputPath);
	const temporaryPath = path.join(
		outputDirectory,
		`.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`
	);

	await mkdir(outputDirectory, { recursive: true });
	try {
		await writeFile(temporaryPath, content, 'utf8');
		await rename(temporaryPath, outputPath);
	} catch (error) {
		await rm(temporaryPath, { force: true });
		throw generationError('write output', 'editor types', outputPath, 'could not replace generated output', error);
	}
}

function generationError(stage: string, packageName: string, subject: string, message: string, cause?: unknown): Error {
	const causeMessage = cause instanceof Error ? ` ${cause.message}` : '';
	return new Error(
		`Editor type generation failed during ${stage} for ${packageName} (${subject}): ${message}.${causeMessage}`,
		{ cause }
	);
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}
