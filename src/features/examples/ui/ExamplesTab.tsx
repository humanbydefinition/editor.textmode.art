import { useState, useCallback, useEffect } from 'react';
import { EXAMPLE_LIBRARIES } from '@/features/examples/model/exampleCatalog';
import { LibrarySidebar } from './LibrarySidebar';
import { ExampleList } from './ExampleList';
import type { Example, ExampleLibraryId } from '@/features/examples/types';

const STORAGE_KEY = 'textmode:examples:selected-library';

function loadPersistedLibrary(): ExampleLibraryId | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (isExampleLibraryId(stored)) return stored;
	} catch {
		/* storage unavailable */
	}
	return null;
}

function isExampleLibraryId(id: string | null): id is ExampleLibraryId {
	return EXAMPLE_LIBRARIES.some((library) => library.id === id);
}

function persistLibrary(id: ExampleLibraryId): void {
	try {
		localStorage.setItem(STORAGE_KEY, id);
	} catch {
		/* storage full or unavailable */
	}
}

interface ExamplesTabProps {
	onLoadExample: (code: string) => void;
	onClose: () => void;
}

export function ExamplesTab({ onLoadExample, onClose }: ExamplesTabProps) {
	const libraries = EXAMPLE_LIBRARIES;
	const defaultLibrary = libraries[0]?.id ?? null;
	const initialLibrary = loadPersistedLibrary();
	const initialId =
		initialLibrary && libraries.some((l) => l.id === initialLibrary) ? initialLibrary : defaultLibrary;

	const [selectedLibraryId, setSelectedLibraryId] = useState<ExampleLibraryId | null>(initialId);
	const selectedLibrary = libraries.find((l) => l.id === selectedLibraryId) ?? libraries[0] ?? null;

	useEffect(() => {
		if (selectedLibraryId) {
			persistLibrary(selectedLibraryId);
		}
	}, [selectedLibraryId]);

	const handleSelect = useCallback(
		(example: Example) => {
			onLoadExample(example.code);
			onClose();
		},
		[onLoadExample, onClose]
	);

	const handleLibraryChange = useCallback((id: ExampleLibraryId) => {
		setSelectedLibraryId(id);
	}, []);

	if (!defaultLibrary || !selectedLibrary) {
		return <div className="p-6 text-center text-zinc-500 italic">No examples available.</div>;
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<LibrarySidebar libraries={libraries} selectedId={selectedLibrary.id} onSelect={handleLibraryChange} />
			<ExampleList library={selectedLibrary} onSelect={handleSelect} />
		</div>
	);
}
