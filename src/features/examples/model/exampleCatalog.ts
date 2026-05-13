import { tutorials as textmodeTutorials } from '@/features/examples/content/textmode-tutorial';
import type { Example } from '@/features/examples/types';

export interface ExampleEngineCatalog {
	id: 'textmode';
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
	].filter((engine) => Object.keys(engine.examples).length > 0);
}
