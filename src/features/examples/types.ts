import type { EXAMPLE_LIBRARIES } from './model/exampleCatalog';

/** Stable library identifier, derived from the catalog. */
export type ExampleLibraryId = (typeof EXAMPLE_LIBRARIES)[number]['id'];

/**
 * Example sketch metadata.
 */
export interface Example {
	id: string;
	name: string;
	description: string;
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
	categories: readonly ExampleCategory[];
}
