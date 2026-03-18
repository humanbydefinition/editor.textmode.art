import { describe, expect, it } from 'vitest';
import * as clientTextmodeProtocol from '@synth.textmode.art/contracts/runner/textmode';
import * as runnerTextmodeProtocol from '@synth.textmode.art/contracts/runner/textmode';

describe('Protocol Contracts', () => {
	describe('Textmode Protocol', () => {
		const validRunnerMessages: unknown[] = [
			{ type: 'READY' },
			{ type: 'RUN_OK', timestamp: 123 },
			{ type: 'RUN_ERROR', message: 'oops' },
			{ type: 'SYNTH_ERROR', message: 'synth failed' },
			{ type: 'TOGGLE_UI' },
			{ type: 'USER_INTERACTION' },
		];

		const validParentMessages: unknown[] = [
			{ type: 'RUN_CODE', code: 't.draw(() => {})' },
			{ type: 'SOFT_RESET', code: 't.draw(() => {})' },
			{ type: 'DISPOSE' },
			{ type: 'AUDIO_DATA', fft: [1, 2], waveform: [128, 127], timestamp: 1 },
		];

		it('keeps protocol versions aligned between client and runner', () => {
			expect(clientTextmodeProtocol.PROTOCOL_VERSION).toBe(runnerTextmodeProtocol.PROTOCOL_VERSION);
		});

		it('re-exports identical textmode protocol functions/constants', () => {
			expect(clientTextmodeProtocol.PROTOCOL_VERSION).toBe(runnerTextmodeProtocol.PROTOCOL_VERSION);
			expect(clientTextmodeProtocol.isInitMessage).toBe(runnerTextmodeProtocol.isInitMessage);
			expect(clientTextmodeProtocol.isParentMessage).toBe(runnerTextmodeProtocol.isParentMessage);
			expect(clientTextmodeProtocol.isRunnerMessage).toBe(runnerTextmodeProtocol.isRunnerMessage);
		});

		it('accepts valid runner-to-parent fixtures in both guards', () => {
			for (const fixture of validRunnerMessages) {
				expect(clientTextmodeProtocol.isRunnerMessage(fixture)).toBe(true);
				expect(runnerTextmodeProtocol.isRunnerMessage(fixture)).toBe(true);
			}
		});

		it('accepts valid parent-to-runner fixtures in both guards', () => {
			for (const fixture of validParentMessages) {
				expect(clientTextmodeProtocol.isParentMessage(fixture)).toBe(true);
				expect(runnerTextmodeProtocol.isParentMessage(fixture)).toBe(true);
			}
		});

		it('rejects malformed fixtures in both guards', () => {
			const malformed: unknown[] = [null, { type: 'BOGUS' }, { code: 'x' }];
			for (const fixture of malformed) {
				expect(clientTextmodeProtocol.isRunnerMessage(fixture)).toBe(false);
				expect(runnerTextmodeProtocol.isRunnerMessage(fixture)).toBe(false);
				expect(clientTextmodeProtocol.isParentMessage(fixture)).toBe(false);
				expect(runnerTextmodeProtocol.isParentMessage(fixture)).toBe(false);
			}
		});

		it('snapshots canonical fixture shapes', () => {
			expect({
				init: { type: 'INIT', v: clientTextmodeProtocol.PROTOCOL_VERSION },
				run: { type: 'RUN_CODE', code: 't.draw(() => {})' },
				ok: { type: 'RUN_OK', timestamp: 123 },
				error: { type: 'RUN_ERROR', message: 'oops', line: 1, column: 1 },
			}).toMatchInlineSnapshot(`
				{
				  "error": {
				    "column": 1,
				    "line": 1,
				    "message": "oops",
				    "type": "RUN_ERROR",
				  },
				  "init": {
				    "type": "INIT",
				    "v": 1,
				  },
				  "ok": {
				    "timestamp": 123,
				    "type": "RUN_OK",
				  },
				  "run": {
				    "code": "t.draw(() => {})",
				    "type": "RUN_CODE",
				  },
				}
			`);
		});
	});
});
