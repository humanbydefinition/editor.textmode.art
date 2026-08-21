import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { typeDefinitions } from '../../src/textmode/config/generated/editorTypes';
import { withTypeScriptProject } from '../support/typescript-project';

const TEXTMODE_LAYER_PATH = 'file:///node_modules/textmode.js/dist/types/textmode/layers/TextmodeLayer.d.ts';
const FILTERS_INDEX_PATH = 'file:///node_modules/textmode.filters.js/dist/types/index.d.ts';
const FIGLET_AUGMENTATION_PATH = 'file:///node_modules/textmode.figlet.js/dist/types/augmentations/textmode.d.ts';
const EXPORT_AUGMENTATION_PATH = 'file:///node_modules/textmode.export.js/dist/types/augmentations/textmode.d.ts';

describe('generated editor declarations', () => {
	it('ships normalized documentation and semantic add-on augmentations', () => {
		expect(typeDefinitions[TEXTMODE_LAYER_PATH]).not.toContain('{@link');
		expect(typeDefinitions[FILTERS_INDEX_PATH]).not.toContain('{@link');
		expect(typeDefinitions[FIGLET_AUGMENTATION_PATH]).toContain("declare module 'textmode.js/addon'");
		expect(typeDefinitions[FIGLET_AUGMENTATION_PATH]).toContain(
			'interface TextmodifierExtensions extends TextmodifierFigletExtensions'
		);
		expect(typeDefinitions[EXPORT_AUGMENTATION_PATH]).toContain("declare module 'textmode.js/addon'");
		expect(typeDefinitions[EXPORT_AUGMENTATION_PATH]).toContain(
			'interface TextmodifierExtensions extends TextmodeExportAPI'
		);
	});

	it('contains deterministic, parseable virtual declarations without internal members or examples', () => {
		const virtualPaths = Object.keys(typeDefinitions);
		expect(virtualPaths).toEqual([...virtualPaths].sort());
		expect(virtualPaths).toContain('file:///src/live/globals.d.ts');

		let prefixedConstructorParameters = 0;
		for (const [virtualPath, content] of Object.entries(typeDefinitions)) {
			const sourceFile = ts.createSourceFile(
				virtualPath,
				content,
				ts.ScriptTarget.Latest,
				true,
				ts.ScriptKind.TS
			);
			const parseDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] })
				.parseDiagnostics;
			expect(parseDiagnostics, virtualPath).toEqual([]);
			expect(content, virtualPath).not.toContain('@example');
			expect(content, virtualPath).not.toMatch(/\{@(?:link|linkplain|linkcode)\b/);

			visit(sourceFile, (node) => {
				const name = (node as ts.NamedDeclaration).name;
				if (!name || !ts.isIdentifier(name) || !/^[$_]/.test(name.text)) return;
				if (ts.isParameter(node)) {
					prefixedConstructorParameters++;
					return;
				}
				if (
					ts.isFunctionDeclaration(node) ||
					ts.isMethodDeclaration(node) ||
					ts.isMethodSignature(node) ||
					ts.isPropertyDeclaration(node) ||
					ts.isPropertySignature(node) ||
					ts.isGetAccessorDeclaration(node) ||
					ts.isSetAccessorDeclaration(node)
				) {
					throw new Error(`${virtualPath} retains prohibited declaration ${name.text}.`);
				}
			});
		}

		expect(prefixedConstructorParameters).toBeGreaterThan(0);
	});

	it('exposes normalized documentation through TypeScript quick info', () => {
		withTypeScriptProject('textmode-doc-links-', (project) => {
			const declarationSource = `
export declare class Demo {
	/**
	 * Uses \`other\`.
	 * @deprecated Prefer \`newer\`.
	 * @see [Demo.docs API reference](https://example.com/docs)
	 */
	docs(): void;
	other(): void;
	newer(): void;
}
`.trimStart();
			const declarationPath = project.write('pkg.d.ts', declarationSource);
			const source = "import { Demo } from './pkg';\nDemo.prototype.docs;\n";
			const sourcePath = project.write('test.js', source);
			const service = project.createLanguageService([sourcePath, declarationPath]);
			const quickInfo = service.getQuickInfoAtPosition(sourcePath, source.indexOf('docs') + 1);

			expect(quickInfo).toBeDefined();
			expect(flattenDisplayParts(quickInfo?.documentation)).toContain('Uses `other`.');
			expect(flattenDisplayParts(quickInfo?.tags?.find((tag) => tag.name === 'see')?.text)).toContain(
				'[Demo.docs API reference](https://example.com/docs)'
			);
			expect(flattenDisplayParts(quickInfo?.tags?.find((tag) => tag.name === 'deprecated')?.text)).toContain(
				'Prefer `newer`.'
			);
		});
	});

	it('typechecks bundled imports, globals, and Textmodifier augmentations together', () => {
		withTypeScriptProject('textmode-addon-types-', (project) => {
			const declarationPaths = project.materializeVirtualFiles(typeDefinitions);
			const sourcePath = project.write(
				'sketch.js',
				`
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
`.trimStart()
			);
			const service = project.createLanguageService([sourcePath, ...declarationPaths]);

			expect(project.formatDiagnostics(service.getSemanticDiagnostics(sourcePath))).toEqual([]);
		});
	});
});

function flattenDisplayParts(parts: readonly { text: string }[] | string | undefined): string {
	if (!parts) return '';
	return typeof parts === 'string' ? parts : parts.map((part) => part.text).join('');
}

function visit(node: ts.Node, visitor: (node: ts.Node) => void): void {
	visitor(node);
	ts.forEachChild(node, (child) => visit(child, visitor));
}
