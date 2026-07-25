import { describe, expect, it } from 'vitest';
import { EXAMPLE_LIBRARIES } from '../../src/features/examples/model/exampleCatalog';
import type { Example, ExampleLibraryCatalog } from '../../src/features/examples/types';
import { typeDefinitions } from '../../src/textmode/config/generatedTypes';
import { withTypeScriptProject } from '../support/typescript-project';

const REQUESTED_LIBRARY_ORDER = ['textmode', 'synth', 'figlet', 'filters', 'export'] as const;

describe('example catalog', () => {
	it('exposes a valid, stable manifest', () => {
		expect(EXAMPLE_LIBRARIES.map((library) => library.id)).toEqual(REQUESTED_LIBRARY_ORDER);

		const examples = flattenExamples(EXAMPLE_LIBRARIES);
		const ids = examples.map(({ example }) => example.id);
		expect(new Set(ids).size).toBe(ids.length);

		for (const library of EXAMPLE_LIBRARIES) {
			expect(library.displayName).toMatch(/^textmode(?:\.js|\..+\.js)$/);
			for (const category of library.categories) {
				expect(category.id).toMatch(/^[a-z0-9-]+$/);
				expect(category.displayName.trim()).not.toBe('');
			}
		}

		for (const { example } of examples) {
			expect(example.id).toMatch(/^[a-z0-9-]+$/);
			expect(example.code.trim()).not.toBe('');
		}
	});
});

describe('example code safety', () => {
	it('parses each example with the same async wrapper shape as the runner', () => {
		for (const { library, example } of flattenExamples(EXAMPLE_LIBRARIES)) {
			expect(() => new Function(wrapUserCode(example.code)), `${library.id}/${example.id}`).not.toThrow();
		}
	});

	it('typechecks all examples together against the live editor declarations', () => {
		withTypeScriptProject('textmode-example-types-', (project) => {
			const declarationPaths = project.materializeVirtualFiles(typeDefinitions);
			const sourcePaths = flattenExamples(EXAMPLE_LIBRARIES).map(({ library, example }) =>
				project.write(`${library.id}-${example.id}.js`, wrapUserCodeForTypecheck(example.code))
			);
			const service = project.createLanguageService([...sourcePaths, ...declarationPaths]);
			const diagnostics = sourcePaths.flatMap((sourcePath) => [
				...service.getSyntacticDiagnostics(sourcePath),
				...service.getSemanticDiagnostics(sourcePath),
			]);

			expect(project.formatDiagnostics(diagnostics)).toEqual([]);
		});
	});

	it('omits local runtime creation and plugin installation boilerplate', () => {
		for (const { example } of flattenExamples(EXAMPLE_LIBRARIES)) {
			expect(example.code).not.toMatch(/\btextmode\.create\s*\(/);
			expect(example.code).not.toMatch(/\bplugins\s*:/);
			expect(example.code).not.toMatch(/\b(?:FigletPlugin|FiltersPlugin|ExportPlugin)\b/);
		}
	});
});

function flattenExamples(
	catalog: readonly ExampleLibraryCatalog[]
): Array<{ library: ExampleLibraryCatalog; example: Example }> {
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
