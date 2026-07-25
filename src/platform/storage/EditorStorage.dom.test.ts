import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from '../../../tests/support/memory-storage';
import { EditorStorage } from './EditorStorage';

describe('EditorStorage', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createMemoryStorage());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('uses the supplied fallback when no sketch has been saved', () => {
		expect(new EditorStorage().loadCode('// fallback')).toBe('// fallback');
	});

	it('preserves intentionally empty saved code', () => {
		const storage = new EditorStorage();
		storage.saveCode('');

		expect(storage.loadCode('// fallback')).toBe('');
	});
});
