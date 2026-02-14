import { tutorials as textmodeTutorials } from '@/features/examples/content/textmode-tutorial';
import { tutorials as strudelTutorials } from '@/features/examples/content/strudel-tutorial';
import type { Example } from '@/features/examples/types';

export interface ExampleEngineCatalog {
	id: 'textmode' | 'strudel';
	displayName: string;
	examples: Record<string, Example[]>;
}

export function getExampleEngineCatalog(): ExampleEngineCatalog[] {
	return [
		{
			id: 'textmode' as const,
			displayName: 'textmode.js',
			examples: {
				tutorial: textmodeTutorials,
			},
		},
		{
			id: 'strudel' as const,
			displayName: 'strudel',
			examples: {
				tutorial: strudelTutorials,
			},
		},
	].filter((engine) => Object.keys(engine.examples).length > 0);
}
