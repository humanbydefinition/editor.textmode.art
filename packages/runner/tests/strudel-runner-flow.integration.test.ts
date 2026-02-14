// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrudelEngine as StrudelRunner } from '../src/engines/strudel/StrudelEngine';

describe('StrudelRunner integration flow', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		delete (window as any).analysers;
	});

	it('emits RUN_OK -> PLAY_STATE -> AUDIO_DATA in order while playing', async () => {
		vi.useFakeTimers();
		const runner = new StrudelRunner() as unknown as {
			runtimeAdapter: {
				ensureRuntimeInitialized: (cb: (error: Error) => void) => Promise<void>;
				isAudioInitialized: () => boolean;
				evaluate: (code: string, autostart: boolean) => Promise<unknown>;
				getMiniLocations: () => undefined;
				getCycle: () => number;
				isRuntimeInitialized: () => boolean;
				initializeAudio: () => Promise<void>;
				hush: () => void;
			};
			handleParentMessage: (message: unknown) => Promise<void>;
			attachPort: (port: any, onMessage: any) => void;
			timerManager: { dispose: () => void };
		};

		const postMessage = vi.fn();
		const mockPort = {
			postMessage,
			start: vi.fn(),
			onmessage: null,
		};
		runner.attachPort(mockPort, vi.fn());

		runner.runtimeAdapter = {
			ensureRuntimeInitialized: async () => {},
			isAudioInitialized: () => true,
			evaluate: async () => ({
				queryArc: () => [
					{
						whole: { begin: { valueOf: () => 2 }, end: { valueOf: () => 3 } },
						context: { locations: [{ start: 10, end: 20 }] },
					},
				],
			}),
			getMiniLocations: () => undefined,
			getCycle: () => 2,
			isRuntimeInitialized: () => true,
			initializeAudio: async () => {},
			hush: () => {},
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).analysers = {
			main: {
				frequencyBinCount: 4,
				fftSize: 8,
				getByteFrequencyData: (arr: Uint8Array) => arr.fill(42),
				getByteTimeDomainData: (arr: Uint8Array) => arr.fill(128),
			},
		};

		await runner.handleParentMessage({
			type: 'STR_RUN_CODE',
			code: 's("bd")',
			autostart: true,
		});

		vi.advanceTimersByTime(120);

		const messageTypes = postMessage.mock.calls.map((call) => (call[0] as { type: string }).type);
		const runOkIndex = messageTypes.indexOf('STR_RUN_OK');
		const playStateIndex = messageTypes.indexOf('STR_PLAY_STATE');
		const audioDataIndex = messageTypes.indexOf('STR_AUDIO_DATA');

		expect(runOkIndex).toBeGreaterThanOrEqual(0);
		expect(playStateIndex).toBeGreaterThan(runOkIndex);
		expect(audioDataIndex).toBeGreaterThan(playStateIndex);

		runner.timerManager.dispose();
	});
});
