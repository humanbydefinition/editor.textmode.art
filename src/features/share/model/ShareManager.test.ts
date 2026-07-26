import { describe, expect, it, vi } from 'vitest';
import { ShareManager, type ShareManagerDependencies } from './ShareManager';
import type { SharePayload } from './sharePayload';

describe('ShareManager', () => {
	it('keeps untrusted shared code locked and opens the consent prompt once', () => {
		const payload: SharePayload = {
			v: 1,
			createdAt: 0,
			engines: { textmode: 't.draw(() => {});' },
		};
		let share = { payload, consented: false, promptOpen: false };
		const setSharePromptOpen = vi.fn((promptOpen: boolean) => {
			share = { ...share, promptOpen };
		});
		const manager = new ShareManager({
			getShare: () => share,
			setSharePayload: vi.fn(),
			setShareConsented: vi.fn(),
			setSharePromptOpen,
			setEditorReadOnly: vi.fn(),
			applyPayload: vi.fn(),
			focusEditor: vi.fn(),
			restoreMainSketch: vi.fn(),
			runCode: vi.fn(),
			replaceUrl: vi.fn(),
		} satisfies ShareManagerDependencies);

		expect(manager.lockExecutionIfNeeded()).toBe(true);
		expect(manager.lockExecutionIfNeeded()).toBe(true);
		expect(setSharePromptOpen).toHaveBeenCalledOnce();

		share = { ...share, consented: true };
		expect(manager.lockExecutionIfNeeded()).toBe(false);
	});
});
