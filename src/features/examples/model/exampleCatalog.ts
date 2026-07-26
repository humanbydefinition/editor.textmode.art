import { synthExampleCategories } from '@/features/examples/content/textmode-synth';
import type { ExampleCategory } from '@/features/examples/types';

export const EXAMPLE_LIBRARIES = [
	{
		id: 'textmode',
		displayName: 'textmode.js',
		categories: [],
	},
	{
		id: 'synth',
		displayName: 'textmode.synth.js',
		categories: synthExampleCategories,
	},
	{
		id: 'figlet',
		displayName: 'textmode.figlet.js',
		categories: [],
	},
	{
		id: 'filters',
		displayName: 'textmode.filters.js',
		categories: [],
	},
	{
		id: 'export',
		displayName: 'textmode.export.js',
		categories: [],
	},
] as const satisfies readonly {
	id: string;
	displayName: string;
	categories: readonly ExampleCategory[];
}[];
