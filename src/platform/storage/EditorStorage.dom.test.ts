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

	it('returns null when no sketch has been saved', () => {
		expect(new EditorStorage().loadCode()).toBeNull();
	});

	it('preserves intentionally empty saved code', () => {
		const storage = new EditorStorage();
		storage.saveCode('');

		expect(storage.loadCode()).toBe('');
	});

	it('returns null when storage cannot be read', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new DOMException('Storage unavailable');
			},
		});

		expect(new EditorStorage().loadCode()).toBeNull();
	});
});
