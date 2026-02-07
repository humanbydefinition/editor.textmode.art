import { examples as textmodeExamples } from '@/engines/textmode/examples';
import { examples as strudelExamples } from '@/engines/strudel/examples';
import type { Example } from '@/types/examples.types';

export interface ExampleEngineCatalog {
	id: 'textmode' | 'strudel';
	displayName: string;
	examples: Record<string, Example[]>;
}

export function getExampleEngineCatalog(strudelEnabled: boolean): ExampleEngineCatalog[] {
	return [
		{
			id: 'textmode' as const,
			displayName: 'textmode.js',
			examples: textmodeExamples,
		},
		...(strudelEnabled
			? [{
				id: 'strudel' as const,
				displayName: 'strudel',
				examples: strudelExamples,
			}]
			: []),
	].filter((engine) => Object.keys(engine.examples).length > 0);
}
