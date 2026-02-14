import { describe, expect, it } from 'vitest';
import * as clientTextmodeProtocol from '@synth.textmode.art/contracts/runner/textmode';
import * as runnerTextmodeProtocol from '@synth.textmode.art/contracts/runner/textmode';
import * as clientStrudelProtocol from '@synth.textmode.art/contracts/runner/strudel';
import * as runnerStrudelProtocol from '@synth.textmode.art/contracts/runner/strudel';

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

	describe('Strudel Protocol', () => {
		const validRunnerMessages: unknown[] = [
			{ type: 'STR_READY', runtimeInitialized: true, audioInitialized: false },
			{ type: 'STR_AUDIO_UNLOCK_REQUIRED' },
			{ type: 'STR_RUN_OK', timestamp: 1, isPlaying: false },
			{ type: 'STR_RUN_ERROR', message: 'bad pattern' },
			{ type: 'STR_PLAY_STATE', isPlaying: true, cycle: 2 },
			{ type: 'STR_AUDIO_DATA', fft: new Uint8Array([1]), waveform: new Uint8Array([128]), timestamp: 1 },
		];

		const validParentMessages: unknown[] = [
			{ type: 'STR_INIT_AUDIO' },
			{ type: 'STR_RUN_CODE', code: 's("bd")', autostart: true },
			{ type: 'STR_HUSH' },
			{ type: 'STR_DISPOSE' },
		];

		it('keeps protocol versions aligned between client and runner', () => {
			expect(clientStrudelProtocol.STRUDEL_PROTOCOL_VERSION).toBe(runnerStrudelProtocol.STRUDEL_PROTOCOL_VERSION);
		});

		it('re-exports identical strudel protocol functions/constants', () => {
			expect(clientStrudelProtocol.STRUDEL_PROTOCOL_VERSION).toBe(runnerStrudelProtocol.STRUDEL_PROTOCOL_VERSION);
			expect(clientStrudelProtocol.isStrudelInitMessage).toBe(runnerStrudelProtocol.isStrudelInitMessage);
			expect(clientStrudelProtocol.isStrudelParentMessage).toBe(runnerStrudelProtocol.isStrudelParentMessage);
		});

		it('accepts valid runner-to-parent fixtures in both guards', () => {
			for (const fixture of validRunnerMessages) {
				expect(clientStrudelProtocol.isStrudelRunnerMessage(fixture)).toBe(true);
			}
		});

		it('accepts valid parent-to-runner fixtures in both guards', () => {
			for (const fixture of validParentMessages) {
				expect(clientStrudelProtocol.isStrudelParentMessage(fixture)).toBe(true);
				expect(runnerStrudelProtocol.isStrudelParentMessage(fixture)).toBe(true);
			}
		});

		it('rejects malformed fixtures in both guards', () => {
			const malformed: unknown[] = [null, { type: 'STR_BOGUS' }, { code: 's("bd")' }];
			for (const fixture of malformed) {
				expect(clientStrudelProtocol.isStrudelParentMessage(fixture)).toBe(false);
				expect(runnerStrudelProtocol.isStrudelParentMessage(fixture)).toBe(false);
				expect(clientStrudelProtocol.isStrudelRunnerMessage(fixture)).toBe(false);
			}
		});

		it('snapshots canonical fixture shapes', () => {
			expect({
				init: { type: 'STR_INIT', v: clientStrudelProtocol.STRUDEL_PROTOCOL_VERSION },
				run: { type: 'STR_RUN_CODE', code: 's("bd")', autostart: true },
				ok: { type: 'STR_RUN_OK', timestamp: 123, isPlaying: true, cycle: 2 },
				playState: { type: 'STR_PLAY_STATE', isPlaying: true, cycle: 2 },
			}).toMatchInlineSnapshot(`
				{
				  "init": {
				    "type": "STR_INIT",
				    "v": 1,
				  },
				  "ok": {
				    "cycle": 2,
				    "isPlaying": true,
				    "timestamp": 123,
				    "type": "STR_RUN_OK",
				  },
				  "playState": {
				    "cycle": 2,
				    "isPlaying": true,
				    "type": "STR_PLAY_STATE",
				  },
				  "run": {
				    "autostart": true,
				    "code": "s("bd")",
				    "type": "STR_RUN_CODE",
				  },
				}
			`);
		});
	});
});
