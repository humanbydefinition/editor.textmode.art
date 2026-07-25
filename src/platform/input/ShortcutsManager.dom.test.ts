import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShortcutsManager, type ShortcutActions } from './ShortcutsManager';

describe('ShortcutsManager', () => {
	const managers: ShortcutsManager[] = [];

	afterEach(() => {
		managers.forEach((manager) => manager.dispose());
		managers.length = 0;
	});

	it.each([
		['hard reset', { code: 'KeyR', ctrlKey: true, key: 'R', shiftKey: true }, 'hardReset', []],
		['increase font', { ctrlKey: true, key: '+', shiftKey: true }, 'changeFontSize', [1]],
		['decrease font', { ctrlKey: true, key: '-', shiftKey: true }, 'changeFontSize', [-1]],
		['toggle auto-execute', { ctrlKey: true, key: 'e' }, 'toggleAutoExecute', []],
		['toggle backdrop', { ctrlKey: true, key: 'b' }, 'toggleEditorBackdrop', []],
		['toggle UI', { ctrlKey: true, key: 'H', shiftKey: true }, 'toggleUIVisibility', []],
	] as const)('dispatches %s', (_label, init, action, args) => {
		const { actions } = createManager(managers);
		const event = new KeyboardEvent('keydown', { cancelable: true, ...init });

		window.dispatchEvent(event);

		expect(actions[action]).toHaveBeenCalledWith(...args);
		expect(event.defaultPrevented).toBe(true);
	});

	it.each([
		['repeated reset', { code: 'KeyR', ctrlKey: true, key: 'R', repeat: true, shiftKey: true }],
		['Command reset', { code: 'KeyR', key: 'R', metaKey: true, shiftKey: true }],
		['reset with Alt', { altKey: true, code: 'KeyR', ctrlKey: true, key: 'R', shiftKey: true }],
		['incomplete reset', { code: 'KeyR', ctrlKey: true, key: 'R' }],
	] as const)('ignores %s', (_label, init) => {
		const { actions } = createManager(managers);

		window.dispatchEvent(new KeyboardEvent('keydown', init));

		for (const action of Object.values(actions)) {
			expect(action).not.toHaveBeenCalled();
		}
	});

	it('leaves Control+Enter in Monaco to its editor command', () => {
		const { actions } = createManager(managers);

		const editor = document.createElement('div');
		editor.className = 'monaco-editor';
		document.body.append(editor);
		const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: true, key: 'Enter' });
		editor.dispatchEvent(event);
		editor.remove();

		expect(event.defaultPrevented).toBe(false);
		for (const action of Object.values(actions)) {
			expect(action).not.toHaveBeenCalled();
		}
	});
});

function createManager(managers: ShortcutsManager[]): {
	actions: Record<keyof ShortcutActions, ReturnType<typeof vi.fn>>;
} {
	const actions = {
		changeFontSize: vi.fn(),
		hardReset: vi.fn(),
		toggleAutoExecute: vi.fn(),
		toggleEditorBackdrop: vi.fn(),
		toggleUIVisibility: vi.fn(),
	};
	const manager = new ShortcutsManager({ actions });
	managers.push(manager);
	manager.init();
	return { actions };
}
