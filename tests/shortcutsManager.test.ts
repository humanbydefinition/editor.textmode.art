import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShortcutsManager } from '../src/platform/input/ShortcutsManager';

describe('ShortcutsManager', () => {
	const managers: ShortcutsManager[] = [];

	afterEach(() => {
		managers.forEach((manager) => manager.dispose());
		managers.length = 0;
	});

	it('hard-resets on Control+Shift+R when Monaco does not own focus', () => {
		const hardReset = vi.fn();
		const manager = new ShortcutsManager({
			actions: {
				changeFontSize: vi.fn(),
				hardReset,
				runCode: vi.fn(),
				toggleAutoExecute: vi.fn(),
				toggleEditorBackdrop: vi.fn(),
				toggleUIVisibility: vi.fn(),
			},
		});
		managers.push(manager);
		manager.init();

		window.dispatchEvent(
			new KeyboardEvent('keydown', {
				code: 'KeyR',
				ctrlKey: true,
				key: 'R',
				shiftKey: true,
			})
		);

		expect(hardReset).toHaveBeenCalledTimes(1);
	});
});
