import { tutorials } from '@/features/examples/content/textmode-tutorial';
import type { ExampleCategory } from '@/features/examples/types';

export const synthExampleCategories: ExampleCategory[] = [
	{
		id: 'tutorials',
		displayName: 'Live synthesis tutorials',
		examples: tutorials,
	},
];
