import { describe, expect, it } from 'vitest';
import { normalizeJSDocLinks } from '../../scripts/lib/normalizeJSDocLinks.js';
import { typeDefinitions } from '../../src/textmode/config/generatedTypes';
import { withTypeScriptProject } from '../support/typescript-project';

const TEXTMODE_LAYER_PATH = 'file:///node_modules/textmode.js/dist/types/textmode/layers/TextmodeLayer.d.ts';
const FILTERS_INDEX_PATH = 'file:///node_modules/textmode.filters.js/dist/types/index.d.ts';
const FIGLET_AUGMENTATION_PATH = 'file:///node_modules/textmode.figlet.js/dist/types/augmentations/textmode.d.ts';
const EXPORT_AUGMENTATION_PATH = 'file:///node_modules/textmode.export.js/dist/types/augmentations/textmode.d.ts';

describe('generated editor declarations', () => {
	it('ships normalized documentation and semantic add-on augmentations', () => {
		expect(typeDefinitions[TEXTMODE_LAYER_PATH]).not.toContain('{@link');
		expect(typeDefinitions[FILTERS_INDEX_PATH]).not.toContain('{@link');
		expect(typeDefinitions[FIGLET_AUGMENTATION_PATH]).toContain("declare module 'textmode.js'");
		expect(typeDefinitions[FIGLET_AUGMENTATION_PATH]).toContain(
			'interface Textmodifier extends TextmodifierFigletExtensions'
		);
		expect(typeDefinitions[EXPORT_AUGMENTATION_PATH]).toContain("declare module 'textmode.js'");
		expect(typeDefinitions[EXPORT_AUGMENTATION_PATH]).toContain('interface Textmodifier extends TextmodeExportAPI');
	});

	it('exposes normalized documentation through TypeScript quick info', () => {
		withTypeScriptProject('textmode-doc-links-', (project) => {
			const declarationSource = normalizeJSDocLinks(
				`
export declare class Demo {
	/**
	 * Uses {@link other}.
	 * @deprecated Prefer {@link newer}.
	 * @see {@link https://example.com/docs | Demo.docs API reference}
	 */
	docs(): void;
	other(): void;
	newer(): void;
}
`.trimStart()
			);
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
