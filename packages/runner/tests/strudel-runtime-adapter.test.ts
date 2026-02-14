import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrudelRuntimeAdapter } from '../src/engines/strudel/StrudelRuntimeAdapter';

const {
	mockEvaluate,
	mockHush,
	mockInitAudio,
	mockInitStrudel,
	mockRegister,
	mockSamples,
} = vi.hoisted(() => ({
	mockEvaluate: vi.fn(),
	mockHush: vi.fn(),
	mockInitAudio: vi.fn(),
	mockInitStrudel: vi.fn(),
	mockRegister: vi.fn(),
	mockSamples: vi.fn(),
}));

vi.mock('@strudel/web', () => ({
	evaluate: mockEvaluate,
	hush: mockHush,
	initAudio: mockInitAudio,
	initStrudel: mockInitStrudel,
	registerZZFXSounds: mockRegister,
	samples: mockSamples,
}));

describe('StrudelRuntimeAdapter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockInitStrudel.mockResolvedValue({
			scheduler: { now: () => 2 },
			state: { miniLocations: [{ start: 1, end: 2 }] },
			stop: vi.fn(),
		});
		mockInitAudio.mockResolvedValue(undefined);
		mockEvaluate.mockResolvedValue({ queryArc: () => [] });
		mockRegister.mockResolvedValue(undefined);
		mockSamples.mockResolvedValue(undefined);
	});

	it('initializes runtime/audio and evaluates code', async () => {
		const adapter = new StrudelRuntimeAdapter();
		await adapter.ensureRuntimeInitialized(vi.fn());
		await adapter.initializeAudio(vi.fn());
		const result = await adapter.evaluate('s("bd")', true);

		expect(adapter.isRuntimeInitialized()).toBe(true);
		expect(adapter.isAudioInitialized()).toBe(true);
		expect(adapter.getCycle()).toBe(2);
		expect(result).toEqual({ queryArc: expect.any(Function) });
		expect(mockInitStrudel).toHaveBeenCalledTimes(1);
		expect(mockInitAudio).toHaveBeenCalledTimes(1);
		expect(mockEvaluate).toHaveBeenCalledWith('s("bd")', true);
	});
});
