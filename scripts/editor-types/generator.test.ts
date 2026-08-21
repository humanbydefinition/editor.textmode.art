import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateEditorTypes } from './generator.js';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const packageNames = [
	'textmode.js',
	'textmode.synth.js',
	'textmode.filters.js',
	'textmode.export.js',
	'textmode.figlet.js',
] as const;
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
	);
});

describe('editor type generation', () => {
	it('writes the installed declaration graph deterministically and leaves unchanged output untouched', async () => {
		const root = await createTemporaryProject();

		const first = await generateEditorTypes({ projectRoot: root });
		const firstContent = await readFile(first.outputPath, 'utf8');
		const definitions = parseGeneratedDefinitions(firstContent);
		const keys = Object.keys(definitions);

		expect(first.status).toBe('written');
		expect(first.packageCount).toBe(packageNames.length);
		expect(first.declarationFileCount).toBe(keys.length - 1);
		expect(first.declarationFileCount).toBeGreaterThan(300);
		expect(first.removedDeclarationCount).toBeGreaterThan(1000);
		expect(keys).toEqual([...keys].sort());
		expect(keys).toContain('file:///node_modules/textmode.js/dist/types/index.d.ts');
		expect(keys).toContain('file:///src/live/globals.d.ts');
		expect(firstContent).toContain('Sources: textmode.js@');
		expect(firstContent).toContain('textmode.synth.js@');
		expect(firstContent).not.toContain(projectRoot);
		expect(firstContent).not.toContain('Generated: 20');
		expect(
			definitions['file:///node_modules/textmode.js/dist/types/rendering/webgl/batching/DrawQueue.d.ts']
		).not.toContain('_commands');
		expect(
			definitions['file:///node_modules/textmode.export.js/dist/types/exporters/base/DataExtractor.d.ts']
		).not.toContain('$extractFramebufferData');
		expect(definitions['file:///node_modules/textmode.figlet.js/dist/types/augmentations/textmode.d.ts']).toContain(
			"declare module 'textmode.js/addon'"
		);
		expect(Object.values(definitions).some((content) => content.includes('@example'))).toBe(false);
		expect(Object.values(definitions).some((content) => /\{@(?:link|linkplain|linkcode)\b/.test(content))).toBe(
			false
		);
		expect(definitions['file:///src/live/globals.d.ts']).toContain('const t: Textmodifier;');

		const second = await generateEditorTypes({ projectRoot: root });
		expect(second.status).toBe('unchanged');
		expect(await readFile(second.outputPath, 'utf8')).toBe(firstContent);
	}, 15_000);

	it('fails when an installed package is unavailable without creating output', async () => {
		const root = await createTemporaryProject({ omitPackage: 'textmode.figlet.js' });

		await expect(generateEditorTypes({ projectRoot: root })).rejects.toThrow(/resolution for textmode\.figlet\.js/);
		await expect(
			readFile(path.join(root, 'src', 'textmode', 'config', 'generated', 'editorTypes.ts'), 'utf8')
		).rejects.toMatchObject({ code: 'ENOENT' });
	});

	it('preserves valid output and removes temporary files after a real declaration copy is corrupted', async () => {
		const root = await createTemporaryProject({ copyPackage: 'textmode.export.js' });
		const initial = await generateEditorTypes({ projectRoot: root });
		const before = await readFile(initial.outputPath, 'utf8');
		await writeFile(
			path.join(root, 'node_modules', 'textmode.export.js', 'dist', 'types', 'index.d.ts'),
			'export interface Broken { value: ; }',
			'utf8'
		);

		await expect(generateEditorTypes({ projectRoot: root })).rejects.toThrow(
			/transform for textmode\.export\.js.*Invalid declaration source/
		);
		expect(await readFile(initial.outputPath, 'utf8')).toBe(before);
		expect((await readdir(path.dirname(initial.outputPath))).some((name) => name.endsWith('.tmp'))).toBe(false);
	});
});

async function createTemporaryProject(options?: {
	omitPackage?: (typeof packageNames)[number];
	copyPackage?: (typeof packageNames)[number];
}): Promise<string> {
	const root = await mkdtemp(path.join(os.tmpdir(), 'editor-types-test-'));
	temporaryDirectories.push(root);
	const nodeModulesPath = path.join(root, 'node_modules');
	await mkdir(nodeModulesPath, { recursive: true });

	for (const packageName of packageNames) {
		if (packageName === options?.omitPackage) continue;

		const sourcePath = await realpath(path.join(projectRoot, 'node_modules', packageName));
		const destinationPath = path.join(nodeModulesPath, packageName);
		if (packageName === options?.copyPackage) {
			await cp(sourcePath, destinationPath, { recursive: true });
		} else {
			await symlink(sourcePath, destinationPath, 'dir');
		}
	}

	return root;
}

function parseGeneratedDefinitions(content: string): Record<string, string> {
	const match = content.match(/export const typeDefinitions: Record<string, string> = ([\s\S]+);\n$/);
	if (!match) throw new Error('Generated module did not contain typeDefinitions.');
	return JSON.parse(match[1]) as Record<string, string>;
}
