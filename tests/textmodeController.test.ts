import { describe, expect, it, vi } from 'vitest';
import { TextmodeController, type TextmodeControllerState } from '../src/textmode/TextmodeController';
import type { TextmodeEditor } from '../src/textmode/editor/TextmodeEditor';
import type { TextmodeRuntime } from '../src/textmode/runtime/TextmodeRuntime';

describe('TextmodeController hard reset', () => {
	it('restarts the runtime for the advertised hard-reset shortcut', () => {
		const restart = vi.fn();
		const clearMarkers = vi.fn();
		const onSaveCode = vi.fn();
		const controller = new TextmodeController(
			{ onSaveCode },
			{
				getEditor: () => ({ getValue: () => 't.setup(() => {});', clearMarkers }) as unknown as TextmodeEditor,
				getRuntime: () => ({ restart }) as unknown as TextmodeRuntime,
				getAutoExecute: () => true,
				getAutoExecuteDelay: () => 0,
				state: {
					clearError: vi.fn(),
				} as unknown as TextmodeControllerState,
				isExecutionLocked: () => false,
				onCodeChanged: vi.fn(),
			}
		);

		controller.handleHardReset();

		expect(restart).toHaveBeenCalledWith('t.setup(() => {});');
		expect(onSaveCode).toHaveBeenCalledWith('t.setup(() => {});');
		expect(clearMarkers).toHaveBeenCalled();
	});
});

describe('TextmodeController working-code confirmation', () => {
	it('confirms successful code through its narrow state interface', () => {
		vi.useFakeTimers();
		const setLastWorkingCode = vi.fn();
		const controller = createController(setLastWorkingCode);

		controller.handleRunOk();
		expect(setLastWorkingCode).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(setLastWorkingCode).toHaveBeenCalledWith('t.draw(() => {});');

		controller.dispose();
		vi.useRealTimers();
	});

	it('cancels pending confirmation when execution fails', () => {
		vi.useFakeTimers();
		const setLastWorkingCode = vi.fn();
		const controller = createController(setLastWorkingCode);

		controller.handleRunOk();
		controller.handleRunError({ message: 'failed' });
		vi.advanceTimersByTime(100);

		expect(setLastWorkingCode).not.toHaveBeenCalled();

		controller.dispose();
		vi.useRealTimers();
	});
});

function createController(setLastWorkingCode: (code: string) => void): TextmodeController {
	return new TextmodeController(
		{ onSaveCode: vi.fn() },
		{
			getEditor: () =>
				({
					getValue: () => 't.draw(() => {});',
					clearMarkers: vi.fn(),
					setErrorMarker: vi.fn(),
				}) as unknown as TextmodeEditor,
			getRuntime: () => null,
			getAutoExecute: () => true,
			getAutoExecuteDelay: () => 0,
			state: {
				clearError: vi.fn(),
				setError: vi.fn(),
				getLastWorkingCode: () => null,
				setLastWorkingCode,
			},
			isExecutionLocked: () => false,
			onCodeChanged: vi.fn(),
		}
	);
}
