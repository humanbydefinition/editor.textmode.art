import { describe, expect, it, vi } from 'vitest';
import { TextmodeController } from '../src/textmode/TextmodeController';
import type { AppStoreAdapter } from '../src/platform/state/adapters/appStoreAdapter';
import type { TextmodeEditor } from '../src/textmode/editor/TextmodeEditor';
import type { TextmodeRuntime } from '../src/textmode/runtime/TextmodeRuntime';

describe('TextmodeController hard reset', () => {
	it('restarts the runtime for the advertised hard-reset shortcut', () => {
		const hardReset = vi.fn();
		const clearMarkers = vi.fn();
		const onSaveCode = vi.fn();
		const controller = new TextmodeController(
			{ onSaveCode },
			{
				getEditor: () => ({ getValue: () => 't.setup(() => {});', clearMarkers }) as unknown as TextmodeEditor,
				getRuntime: () => ({ hardReset }) as unknown as TextmodeRuntime,
				getAutoExecute: () => true,
				getAutoExecuteDelay: () => 0,
				store: {
					engine: { clearError: vi.fn(), setStatus: vi.fn() },
					share: { getPayload: () => null, getConsented: () => false, getPromptOpen: () => false },
				} as unknown as AppStoreAdapter,
			}
		);

		controller.handleHardReset();

		expect(hardReset).toHaveBeenCalledWith('t.setup(() => {});');
		expect(onSaveCode).toHaveBeenCalledWith('t.setup(() => {});');
		expect(clearMarkers).toHaveBeenCalled();
	});
});
