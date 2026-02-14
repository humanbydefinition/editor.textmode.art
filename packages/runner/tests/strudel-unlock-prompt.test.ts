// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrudelUnlockPromptManager } from '../src/engines/strudel/StrudelUnlockPromptManager';

describe('StrudelUnlockPromptManager', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		document.head.querySelectorAll('style').forEach((node) => node.remove());
	});

	it('shows, hides and updates status', () => {
		const manager = new StrudelUnlockPromptManager({
			onUnlockClick: async () => {},
		});

		manager.setup();
		expect(manager.isVisible()).toBe(true);

		manager.setStatus('needs interaction');
		manager.hide();
		expect(manager.isVisible()).toBe(false);

		manager.show();
		expect(manager.isVisible()).toBe(true);
		manager.dispose();
	});

	it('invokes unlock callback on button click', async () => {
		const onUnlockClick = vi.fn(async () => {});
		const manager = new StrudelUnlockPromptManager({ onUnlockClick });
		manager.setup();

		const button = document.querySelector('.strudel-unlock-button') as HTMLButtonElement;
		button.click();
		await Promise.resolve();

		expect(onUnlockClick).toHaveBeenCalledTimes(1);
		manager.dispose();
	});
});
