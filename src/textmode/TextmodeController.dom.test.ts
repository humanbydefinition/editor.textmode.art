import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	TextmodeController,
	type TextmodeControllerDependencies,
	type TextmodeControllerState,
} from './TextmodeController';

describe('TextmodeController execution', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

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
	});

	it('replaces gallery code through a runtime reset without persisting it', () => {
		const harness = createHarness();

		harness.controller.replaceAndRun('gallery code', 'reset-runtime');

		expect(harness.onSaveCode).not.toHaveBeenCalled();
		expect(harness.resetRuntime).toHaveBeenCalledWith('gallery code');
	});

	it('resets the current sketch runtime in place for the hard-reset shortcut', () => {
		const harness = createHarness();

		harness.controller.handleHardReset();

		expect(harness.resetRuntime).toHaveBeenCalledWith('current code');
		expect(harness.forceRun).not.toHaveBeenCalled();
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
		expect(harness.setError).toHaveBeenCalledWith({ message: 'failed' });

		harness.controller.dispose();
	});
});

function createHarness() {
	const onSaveCode = vi.fn();
	const setValue = vi.fn();
	const forceRun = vi.fn();
	const resetRuntime = vi.fn();
	const setError = vi.fn();
	const setLastWorkingCode = vi.fn();
	const editor = {
		getValue: () => 'current code',
		setValue,
		clearMarkers: vi.fn(),
		setErrorMarker: vi.fn(),
	};
	const state = {
		clearError: vi.fn(),
		setError,
		getLastWorkingCode: () => null,
		setLastWorkingCode,
	} satisfies TextmodeControllerState;
	const dependencies = {
		editor,
		runtime: { forceRun, resetRuntime },
		getAutoExecute: () => true,
		getAutoExecuteDelay: () => 500,
		state,
		isExecutionLocked: () => false,
		onCodeChanged: vi.fn(),
	} satisfies TextmodeControllerDependencies;
	const controller = new TextmodeController({ onSaveCode }, dependencies);

	return {
		controller,
		onSaveCode,
		setValue,
		forceRun,
		resetRuntime,
		setError,
		setLastWorkingCode,
	};
}
