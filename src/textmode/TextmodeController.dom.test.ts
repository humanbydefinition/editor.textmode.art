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

		harness.controller.handleRunOk('current code');
		vi.advanceTimersByTime(100);
		expect(harness.setLastWorkingCode).toHaveBeenCalledWith('current code');

		harness.setLastWorkingCode.mockClear();
		harness.controller.handleRunOk('current code');
		harness.controller.handleExecutionError({ message: 'failed' });
		vi.advanceTimersByTime(100);
		expect(harness.setLastWorkingCode).not.toHaveBeenCalled();
		expect(harness.setError).toHaveBeenCalledWith({ message: 'failed' });

		harness.controller.dispose();
	});

	it('commits a candidate only after the runtime probe succeeds', async () => {
		const harness = createHarness();
		harness.tryCandidate.mockResolvedValue(true);

		await expect(harness.controller.tryReplaceAndRun('candidate code')).resolves.toBe(true);

		expect(harness.tryCandidate).toHaveBeenCalledWith('candidate code', 'current code');
		expect(harness.setValue).toHaveBeenCalledWith('candidate code', { silent: true });
		expect(harness.onSaveCode).toHaveBeenCalledWith('candidate code');
		expect(harness.setLastWorkingCode).toHaveBeenCalledWith('candidate code');
	});

	it('leaves editor and persistence untouched when the runtime probe rejects a candidate', async () => {
		const harness = createHarness();
		harness.tryCandidate.mockResolvedValue(false);

		await expect(harness.controller.tryReplaceAndRun('broken code')).resolves.toBe(false);

		expect(harness.tryCandidate).toHaveBeenCalledWith('broken code', 'current code');
		expect(harness.setValue).not.toHaveBeenCalled();
		expect(harness.onSaveCode).not.toHaveBeenCalled();
		expect(harness.setLastWorkingCode).not.toHaveBeenCalled();
	});

	it('ignores concurrent candidate probes and refuses a stale commit after an edit', async () => {
		let resolveProbe!: (value: boolean) => void;
		const probe = new Promise<boolean>((resolve) => {
			resolveProbe = resolve;
		});
		const harness = createHarness();
		harness.tryCandidate.mockReturnValue(probe);

		const first = harness.controller.tryReplaceAndRun('candidate code');
		const second = harness.controller.tryReplaceAndRun('other code');
		harness.editorValue.value = 'edited while probing';
		harness.controller.handleCodeChange('edited while probing');
		harness.editorValue.value = 'current code';
		resolveProbe(true);

		await expect(second).resolves.toBe(false);
		await expect(first).resolves.toBe(false);
		expect(harness.tryCandidate).toHaveBeenCalledOnce();
		expect(harness.forceRun).toHaveBeenCalledWith('current code');
		expect(harness.setValue).not.toHaveBeenCalled();
		harness.controller.dispose();
	});

	it('confirms the acknowledged source rather than the current editor buffer', () => {
		vi.useFakeTimers();
		const harness = createHarness();
		harness.editorValue.value = 'newer unacknowledged code';

		harness.controller.handleRunOk('acknowledged code');
		vi.advanceTimersByTime(100);

		expect(harness.setLastWorkingCode).toHaveBeenCalledWith('acknowledged code');
		harness.controller.dispose();
	});
});

function createHarness() {
	const onSaveCode = vi.fn();
	const setValue = vi.fn();
	const forceRun = vi.fn();
	const resetRuntime = vi.fn();
	const tryCandidate = vi.fn<(code: string, baseline: string) => Promise<boolean>>();
	const setError = vi.fn();
	const setLastWorkingCode = vi.fn();
	const editorValue = { value: 'current code' };
	const editor = {
		getValue: () => editorValue.value,
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
		runtime: { forceRun, resetRuntime, tryCandidate },
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
		tryCandidate,
		setError,
		setLastWorkingCode,
		editorValue,
	};
}
