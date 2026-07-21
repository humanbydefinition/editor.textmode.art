import { describe, expect, it, vi } from 'vitest';
import { TextmodeController, type TextmodeControllerState } from '../src/textmode/TextmodeController';
import type { TextmodeEditor } from '../src/textmode/editor/TextmodeEditor';
import type { TextmodeRuntime } from '../src/textmode/runtime/TextmodeRuntime';

describe('TextmodeController execution', () => {
	it('replaces code without re-entering the change callback or leaving a pending run', () => {
		vi.useFakeTimers();
		const harness = createHarness();
		harness.controller.handleCodeChange('typed code');
		harness.onSaveCode.mockClear();

		harness.controller.replaceAndRun('example code');
		vi.runAllTimers();

		expect(harness.setValue).toHaveBeenCalledWith('example code', { silent: true });
		expect(harness.onSaveCode).toHaveBeenCalledOnce();
		expect(harness.forceRun).toHaveBeenCalledOnce();
		expect(harness.forceRun).toHaveBeenCalledWith('example code');

		harness.controller.dispose();
		vi.useRealTimers();
	});

	it('resets persisted and working code before one restart', () => {
		const harness = createHarness();

		harness.controller.replaceAndRun('default code', 'reset');

		expect(harness.onClearCode).toHaveBeenCalledOnce();
		expect(harness.setLastWorkingCode).toHaveBeenCalledWith(null);
		expect(harness.onSaveCode).toHaveBeenCalledOnce();
		expect(harness.restart).toHaveBeenCalledWith('default code');
	});

	it('confirms successful code and cancels confirmation after an error', () => {
		vi.useFakeTimers();
		const harness = createHarness();

		harness.controller.handleRunOk();
		vi.advanceTimersByTime(100);
		expect(harness.setLastWorkingCode).toHaveBeenCalledWith('current code');

		harness.setLastWorkingCode.mockClear();
		harness.controller.handleRunOk();
		harness.controller.handleExecutionError({ message: 'failed' });
		vi.advanceTimersByTime(100);
		expect(harness.setLastWorkingCode).not.toHaveBeenCalled();
		expect(harness.setError).toHaveBeenCalledWith({ message: 'failed', source: 'textmode' });

		harness.controller.dispose();
		vi.useRealTimers();
	});
});

function createHarness() {
	const onSaveCode = vi.fn();
	const onClearCode = vi.fn();
	const setValue = vi.fn();
	const forceRun = vi.fn();
	const restart = vi.fn();
	const setError = vi.fn();
	const setLastWorkingCode = vi.fn();
	const editor = {
		getValue: () => 'current code',
		setValue,
		clearMarkers: vi.fn(),
		setErrorMarker: vi.fn(),
	} as unknown as TextmodeEditor;
	const state = {
		clearError: vi.fn(),
		setError,
		getLastWorkingCode: () => null,
		setLastWorkingCode,
	} satisfies TextmodeControllerState;
	const controller = new TextmodeController(
		{ onSaveCode, onClearCode },
		{
			getEditor: () => editor,
			getRuntime: () => ({ forceRun, restart }) as unknown as TextmodeRuntime,
			getAutoExecute: () => true,
			getAutoExecuteDelay: () => 500,
			state,
			isExecutionLocked: () => false,
			onCodeChanged: vi.fn(),
		}
	);

	return {
		controller,
		onSaveCode,
		onClearCode,
		setValue,
		forceRun,
		restart,
		setError,
		setLastWorkingCode,
	};
}
