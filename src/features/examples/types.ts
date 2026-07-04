/**
 * Stable library identifier for the example catalog.
 */
export type ExampleLibraryId = 'textmode' | 'synth' | 'figlet' | 'filters' | 'export';

/**
 * Example sketch metadata.
 */
export interface Example {
	id: string;
	name: string;
	description: string;
	category: string;
	code: string;
}

/**
 * A named section within a library tab.
 */
export interface ExampleCategory {
	id: string;
	displayName: string;
	examples: Example[];
}

/**
 * Example catalog grouped by add-on/library.
 */
export interface ExampleLibraryCatalog {
	id: ExampleLibraryId;
	displayName: string;
	categories: ExampleCategory[];
}
