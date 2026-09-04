import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebMcpToolService, type EditorAgentCapabilities } from './WebMcpToolService';
import type { AppState } from '@/platform/state/appStore';

const mockGalleryCatalog = [
	{
		slug: 'demo',
		title: 'Demo Sketch',
		description: 'A demo sketch.',
		textmodeCode: 't.print("hello")',
		category: 'gallery',
	},
];

vi.mock('@/features/gallery-sketches/model/catalog', () => ({
	getGallerySketchCatalog: () => mockGalleryCatalog,
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

	it('completes a read-only call when a WebMCP bridge omits the optional cancellation signal', async () => {
		await expect(
			service.execute('textmode_get_editor_state', {}, undefined as unknown as AbortSignal)
		).resolves.toMatchObject({ ok: true, data: { revision: 4 } });
		expect(state.agent.activity.at(-1)).toMatchObject({ status: 'success' });
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

	it('validates bounded inspection inputs and paginates a large cell result', async () => {
		capabilities.inspectArtwork = vi.fn(async () => ({
			sampledAt: 'now',
			canvas: { width: 80, height: 25 },
			grid: { columns: 80, rows: 25 },
			layers: [],
			cells: Array.from({ length: 64 }, (_, index) => ({
				x: index,
				y: 0,
				ch: '█',
				fg: '#ff00ff',
				bg: '#000000',
			})),
			nextCursor: null,
		}));

		expect(
			await service.execute(
				'textmode_inspect_artwork',
				{ detail: 'cells', region: { x: 0, y: 0, width: 65, height: 1 } },
				signal
			)
		).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });

		const result = await service.execute(
			'textmode_inspect_artwork',
			{ detail: 'cells', region: { x: 0, y: 0, width: 64, height: 1 } },
			signal
		);
		expect(result).toMatchObject({ ok: true, data: { nextCursor: expect.any(Number) } });
		if (result && typeof result === 'object' && 'data' in result) {
			const data = result.data as { cells: unknown[] };
			expect(data.cells.length).toBeLessThan(64);
		}
	});

	it('reports runner cancellation as an aborted tool call', async () => {
		const controller = new AbortController();
		capabilities.inspectArtwork = vi.fn(
			(_input, signal) =>
				new Promise((_, reject) =>
					signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
				)
		);

		const resultPromise = service.execute('textmode_inspect_artwork', { detail: 'summary' }, controller.signal);
		controller.abort();

		await expect(resultPromise).resolves.toMatchObject({ ok: false, error: { code: 'ABORTED' } });
		expect(state.agent.activity.at(-1)).toMatchObject({ status: 'aborted' });
	});

	it('rejects unsupported export target combinations before contacting the runner', async () => {
		expect(
			await service.execute('textmode_prepare_export', { format: 'svg', target: 'all' }, signal)
		).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_FORMAT' } });
		expect(capabilities.prepareExport).not.toHaveBeenCalled();
	});

	it('lists gallery sketches through textmode_list_examples and stages through textmode_stage_example', async () => {
		const listResult = await service.execute('textmode_list_examples', {}, signal);
		expect(listResult).toMatchObject({
			ok: true,
			data: {
				items: [
					{
						id: 'gallery:demo',
						title: 'Demo Sketch',
						category: 'gallery',
						description: 'A demo sketch.',
					},
				],
			},
		});

		const stageResult = await service.execute(
			'textmode_stage_example',
			{ exampleId: 'gallery:demo', baseRevision: 4 },
			signal
		);
		expect(stageResult).toMatchObject({ ok: true, data: { status: 'awaiting_user_review' } });
		expect(state.agent.proposal?.summary).toBe('Start from Demo Sketch.');
	});
});
