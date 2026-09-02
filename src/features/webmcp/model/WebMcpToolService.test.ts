import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebMcpToolService, type EditorAgentCapabilities } from './WebMcpToolService';
import type { AppState } from '@/platform/state/appStore';

vi.mock('@/features/gallery-sketches/model/catalog', () => ({
	getGallerySketchCatalog: () => [],
}));

const signal = new AbortController().signal;

describe('WebMcpToolService', () => {
	let code = 't.clear()';
	const revision = 4;
	let state: AppState;
	let capabilities: EditorAgentCapabilities;
	let service: WebMcpToolService;

	beforeEach(() => {
		state = {
			share: { payload: null, consented: false, promptOpen: false },
			gallerySketch: null,
			runnerStatus: 'connected',
			error: null,
			agent: { support: 'ready', registeredTools: [], proposal: null, preparedExport: null, activity: [] },
		} as unknown as AppState;
		capabilities = {
			getCode: () => code,
			getRevision: () => revision,
			validateCode: vi.fn(async () => ({ valid: true })),
			previewCandidate: vi.fn(async () => true),
			acceptPreviewedCandidate: vi.fn(() => true),
			restoreAcceptedCode: vi.fn(),
			getRunnerCapabilities: () => ({ codeValidation: true, artworkInspection: true, exportPreparation: true }),
			inspectArtwork: vi.fn(async () => ({ sampledAt: 'now', grid: { columns: 2, rows: 2 } })),
			prepareExport: vi.fn(async () => ({
				format: 'txt',
				mimeType: 'text/plain',
				fileName: 'art.txt',
				data: 'hello',
			})),
			openShare: vi.fn(),
			getState: () => state,
			setProposal: (proposal) => {
				state.agent.proposal = proposal;
			},
			setPreparedExport: (artifact) => {
				state.agent.preparedExport = artifact;
			},
			log: (entry) => {
				state.agent.activity.push(entry);
			},
		};
		vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
		vi.stubGlobal('window', { setTimeout, clearTimeout });
		vi.stubGlobal('document', { createElement: vi.fn(() => ({ click: vi.fn() })) });
		service = new WebMcpToolService(capabilities);
	});

	it('returns compact state and surrogate-safe source pages', async () => {
		code = 'a😀b';
		expect(await service.execute('textmode_get_editor_state', {}, signal)).toMatchObject({
			ok: true,
			data: { revision: 4 },
		});
		expect(
			await service.execute('textmode_read_sketch', { cursor: 2, maxChars: 256, revision: 4 }, signal)
		).toMatchObject({ ok: true, data: { start: 1 } });
		expect(await service.execute('textmode_read_sketch', { revision: 3 }, signal)).toMatchObject({
			ok: false,
			error: { code: 'REVISION_CONFLICT' },
		});
	});

	it('stages inert code, then previews and accepts only from the human action', async () => {
		const result = await service.execute(
			'textmode_stage_sketch',
			{ baseRevision: 4, code: 't.clear()', summary: 'Clear the canvas.' },
			signal
		);
		expect(result).toMatchObject({ ok: true, data: { status: 'awaiting_user_review' } });
		expect(capabilities.validateCode).toHaveBeenCalledOnce();
		expect(capabilities.previewCandidate).not.toHaveBeenCalled();
		expect(await service.preview()).toBe(true);
		expect(capabilities.previewCandidate).toHaveBeenCalledOnce();
		expect(service.accept()).toBe(true);
		expect(capabilities.acceptPreviewedCandidate).toHaveBeenCalledOnce();
	});

	it('gates mutations for an untrusted share and keeps artifact download human-owned', async () => {
		state.share.payload = {} as AppState['share']['payload'];
		expect(
			await service.execute(
				'textmode_stage_sketch',
				{ baseRevision: 4, code: 't.clear()', summary: 'Clear.' },
				signal
			)
		).toMatchObject({ ok: false, error: { code: 'LOCKED_UNTRUSTED_SHARE' } });
		state.share.payload = null;
		const exported = await service.execute(
			'textmode_prepare_export',
			{ format: 'txt', target: 'selected' },
			signal
		);
		expect(exported).toMatchObject({ ok: true, data: { format: 'txt', dialogOpen: true } });
		expect(service.download()).toBe(true);
		service.closeExport();
		expect(state.agent.preparedExport).toBeNull();
	});

	it('delegates semantic inspection and opens sharing without copying', async () => {
		expect(await service.execute('textmode_inspect_artwork', { detail: 'summary' }, signal)).toMatchObject({
			ok: true,
			data: { grid: { columns: 2 } },
		});
		expect(await service.execute('textmode_prepare_share', {}, signal)).toMatchObject({
			ok: true,
			data: { dialogOpen: true },
		});
		expect(capabilities.openShare).toHaveBeenCalledOnce();
	});
});
