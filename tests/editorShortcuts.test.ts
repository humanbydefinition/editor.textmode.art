import { describe, expect, it } from 'vitest';
import { isHardResetShortcut, type ShortcutKeyEvent } from '../src/platform/input/shortcuts';

const BASE_EVENT: ShortcutKeyEvent = {
	altKey: false,
	code: 'KeyR',
	ctrlKey: false,
	metaKey: false,
	repeat: false,
	shiftKey: false,
};

describe('editor shortcuts', () => {
	it('matches Control+Shift+R exactly', () => {
		expect(isHardResetShortcut({ ...BASE_EVENT, ctrlKey: true, shiftKey: true })).toBe(true);
	});

	it('rejects Command-based and incomplete reset combinations', () => {
		expect(isHardResetShortcut({ ...BASE_EVENT, metaKey: true, shiftKey: true })).toBe(false);
		expect(isHardResetShortcut({ ...BASE_EVENT, ctrlKey: true, metaKey: true })).toBe(false);
		expect(isHardResetShortcut({ ...BASE_EVENT, ctrlKey: true })).toBe(false);
		expect(isHardResetShortcut({ ...BASE_EVENT, ctrlKey: true, shiftKey: true, altKey: true })).toBe(false);
		expect(isHardResetShortcut({ ...BASE_EVENT, ctrlKey: true, shiftKey: true, repeat: true })).toBe(false);
	});
});
