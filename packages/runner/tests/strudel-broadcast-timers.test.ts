import { afterEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTimerManager } from '../src/engines/strudel/BroadcastTimerManager';

describe('BroadcastTimerManager', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('ticks cycle and audio callbacks while playing', () => {
		vi.useFakeTimers();
		const onCycleTick = vi.fn();
		const onAudioTick = vi.fn();
		const manager = new BroadcastTimerManager({
			onCycleTick,
			onAudioTick,
			isPlaying: () => true,
		});

		manager.startCycleBroadcast();
		manager.startAudioBroadcast();
		vi.advanceTimersByTime(120);

		expect(onCycleTick).toHaveBeenCalled();
		expect(onAudioTick).toHaveBeenCalled();

		manager.dispose();
	});

	it('does not tick audio callback when not playing', () => {
		vi.useFakeTimers();
		const onAudioTick = vi.fn();
		const manager = new BroadcastTimerManager({
			onCycleTick: vi.fn(),
			onAudioTick,
			isPlaying: () => false,
		});

		manager.startAudioBroadcast();
		vi.advanceTimersByTime(100);
		expect(onAudioTick).not.toHaveBeenCalled();
		manager.dispose();
	});
});
