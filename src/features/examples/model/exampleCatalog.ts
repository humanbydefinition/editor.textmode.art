import { figletExampleCategories } from '@/features/examples/content/textmode-figlet';
import { filtersExampleCategories } from '@/features/examples/content/textmode-filters';
import { exportExampleCategories } from '@/features/examples/content/textmode-export';
import { textmodeExampleCategories } from '@/features/examples/content/textmode-js';
import { synthExampleCategories } from '@/features/examples/content/textmode-synth';
import type { ExampleLibraryCatalog, ExampleLibraryId } from '@/features/examples/types';

export const EXAMPLE_LIBRARY_ORDER = ['textmode', 'synth', 'figlet', 'filters', 'export'] as const satisfies readonly ExampleLibraryId[];

const EXAMPLE_LIBRARY_CATALOG: ExampleLibraryCatalog[] = [
	{
		id: 'textmode',
		displayName: 'textmode.js',
		categories: textmodeExampleCategories,
	},
	{
		id: 'synth',
		displayName: 'textmode.synth.js',
		categories: synthExampleCategories,
	},
	{
		id: 'figlet',
		displayName: 'textmode.figlet.js',
		categories: figletExampleCategories,
	},
	{
		id: 'filters',
		displayName: 'textmode.filters.js',
		categories: filtersExampleCategories,
	},
	{
		id: 'export',
		displayName: 'textmode.export.js',
		categories: exportExampleCategories,
	},
];

export function getExampleLibraryCatalog(): ExampleLibraryCatalog[] {
	const catalogById = new Map(EXAMPLE_LIBRARY_CATALOG.map((library) => [library.id, library]));

	return EXAMPLE_LIBRARY_ORDER.map((id) => catalogById.get(id)).filter(
		(library): library is ExampleLibraryCatalog => Boolean(library)
	);
}
