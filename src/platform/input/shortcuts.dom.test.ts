import { afterEach, describe, expect, it, vi } from 'vitest';
import { installShortcuts, type ShortcutActions } from './shortcuts';

describe('installShortcuts', () => {
	const removeShortcuts: Array<() => void> = [];

	afterEach(() => {
		removeShortcuts.splice(0).forEach((remove) => remove());
	});

	it.each([
		['hard reset', { code: 'KeyR', ctrlKey: true, key: 'R', shiftKey: true }, 'hardReset', []],
		['increase font', { ctrlKey: true, key: '+', shiftKey: true }, 'changeFontSize', [1]],
		['decrease font', { ctrlKey: true, key: '-', shiftKey: true }, 'changeFontSize', [-1]],
		['toggle auto-execute', { ctrlKey: true, key: 'e' }, 'toggleAutoExecute', []],
		['toggle backdrop', { ctrlKey: true, key: 'b' }, 'toggleEditorBackdrop', []],
		['toggle UI', { ctrlKey: true, key: 'H', shiftKey: true }, 'toggleUIVisibility', []],
	] as const)('dispatches %s', (_label, init, action, args) => {
		const actions = createActions();
		const event = new KeyboardEvent('keydown', { cancelable: true, ...init });
		removeShortcuts.push(installShortcuts(actions));

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
		const actions = createActions();
		removeShortcuts.push(installShortcuts(actions));

		window.dispatchEvent(new KeyboardEvent('keydown', init));

		for (const action of Object.values(actions)) {
			expect(action).not.toHaveBeenCalled();
		}
	});

	it('removes the capture listener', () => {
		const actions = createActions();
		const remove = installShortcuts(actions);
		remove();

		window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'e' }));

		expect(actions.toggleAutoExecute).not.toHaveBeenCalled();
	});

	it('leaves Control+Enter in Monaco to its editor command', () => {
		const actions = createActions();
		removeShortcuts.push(installShortcuts(actions));

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

type ShortcutActionSpies = {
	changeFontSize: ReturnType<typeof vi.fn<(delta: number) => void>>;
	hardReset: ReturnType<typeof vi.fn<() => void>>;
	toggleAutoExecute: ReturnType<typeof vi.fn<() => void>>;
	toggleEditorBackdrop: ReturnType<typeof vi.fn<() => void>>;
	toggleUIVisibility: ReturnType<typeof vi.fn<() => void>>;
};

function createActions(): ShortcutActions & ShortcutActionSpies {
	return {
		changeFontSize: vi.fn<(delta: number) => void>(),
		hardReset: vi.fn<() => void>(),
		toggleAutoExecute: vi.fn<() => void>(),
		toggleEditorBackdrop: vi.fn<() => void>(),
		toggleUIVisibility: vi.fn<() => void>(),
	};
}
