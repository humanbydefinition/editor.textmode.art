import { EXAMPLE_LIBRARIES } from '@/features/examples/model/exampleCatalog';
import { getGallerySketchCatalog } from '@/features/gallery-sketches/model/catalog';
import type { AppState } from '@/platform/state/appStore';
import type { ToolErrorCode, ToolName, ToolResult } from './contracts';
import { AgentChangeManager } from './AgentChangeManager';
import { AgentMutationQueue } from './AgentMutationQueue';
import { PreparedExportStore } from './PreparedExportStore';
import { asRecord, cursorBoundary, integer, onlyKeys, text } from './validation';

const MAX_RESULT_CHARS = 1500;

export interface EditorAgentCapabilities {
	getCode(): string;
	getRevision(): number;
	validateCode(
		code: string,
		signal?: AbortSignal
	): Promise<{ valid: boolean; diagnostic?: { message: string; line?: number; column?: number } }>;
	previewCandidate(code: string, baseline: string, revision: number): Promise<boolean>;
	acceptPreviewedCandidate(): boolean;
	restoreAcceptedCode(): void;
	getRunnerCapabilities(): Record<string, boolean>;
	inspectArtwork(input: unknown, signal?: AbortSignal): Promise<unknown>;
	prepareExport(input: unknown, signal?: AbortSignal): Promise<unknown>;
	openShare(): void;
	getState(): AppState;
	setProposal(value: AppState['agent']['proposal']): void;
	setPreparedExport(value: AppState['agent']['preparedExport']): void;
	log(entry: AppState['agent']['activity'][number]): void;
}

export class WebMcpToolService {
	readonly queue = new AgentMutationQueue();
	readonly changes = new AgentChangeManager();
	readonly exports = new PreparedExportStore();

	private readonly capabilities: EditorAgentCapabilities;

	constructor(capabilities: EditorAgentCapabilities) {
		this.capabilities = capabilities;
	}

	async execute(name: ToolName, input: unknown, signal: AbortSignal): Promise<unknown> {
		const startedAt = Date.now();
		const id = crypto.randomUUID();
		this.capabilities.log({ id, tool: name, status: 'pending', startedAt });
		try {
			const result = await this.dispatch(name, input, signal);
			this.capabilities.log({ id, tool: name, status: 'success', startedAt, durationMs: Date.now() - startedAt });
			return budget(result);
		} catch (error) {
			const aborted = error instanceof DOMException && error.name === 'AbortError';
			this.capabilities.log({
				id,
				tool: name,
				status: aborted ? 'aborted' : 'failure',
				startedAt,
				durationMs: Date.now() - startedAt,
				message: aborted ? 'aborted' : 'Request failed',
			});
			return this.failure(
				aborted ? 'ABORTED' : 'RUNTIME_ERROR',
				aborted ? 'Request was aborted' : 'The request could not be completed',
				false
			);
		}
	}

	async preview(): Promise<boolean> {
		const candidate = this.changes.getCandidate();
		if (!candidate) return false;
		this.capabilities.setProposal(this.changes.setPreview('previewing'));
		const success = await this.capabilities.previewCandidate(
			candidate.candidate,
			candidate.baseline,
			candidate.revision
		);
		this.capabilities.setProposal(
			this.changes.setPreview(
				success ? 'preview-ready' : 'preview-error',
				success ? undefined : 'Preview failed; accepted sketch restored.'
			)
		);
		return success;
	}

	accept(): boolean {
		this.changes.clear();
		this.capabilities.setProposal(null);
		return this.capabilities.acceptPreviewedCandidate();
	}

	reject(): void {
		this.capabilities.restoreAcceptedCode();
		this.changes.clear();
		this.capabilities.setProposal(null);
	}

	invalidate(): void {
		if (!this.changes.getCandidate()) return;
		this.reject();
	}

	download(): boolean {
		return this.exports.download();
	}
	closeExport(): void {
		this.exports.clear();
		this.capabilities.setPreparedExport(null);
	}
	dispose(): void {
		this.reject();
		this.exports.clear();
	}

	private async dispatch(name: ToolName, input: unknown, signal: AbortSignal): Promise<unknown> {
		switch (name) {
			case 'textmode_get_editor_state':
				return this.state(input);
			case 'textmode_read_sketch':
				return this.read(input);
			case 'textmode_list_examples':
				return this.listExamples(input);
			case 'textmode_stage_sketch':
				return this.stageSketch(input, signal);
			case 'textmode_stage_example':
				return this.stageExample(input, signal);
			case 'textmode_inspect_artwork':
				return this.inspect(input, signal);
			case 'textmode_prepare_export':
				return this.prepareExport(input, signal);
			case 'textmode_prepare_share':
				return this.prepareShare(input, signal);
		}
	}

	private state(input: unknown): ToolResult<unknown> {
		if (!validEmpty(input)) return this.failure('VALIDATION_ERROR', 'This tool accepts no input', false);
		const state = this.capabilities.getState();
		const code = this.capabilities.getCode();
		return this.success({
			revision: this.capabilities.getRevision(),
			mode: state.share.payload ? 'shared' : state.gallerySketch ? 'gallery' : 'editor',
			editable: !state.share.payload || state.share.consented,
			shareLocked: Boolean(state.share.payload && !state.share.consented),
			code: { lines: code.split('\n').length, characters: code.length },
			runner: {
				status: state.runnerStatus,
				capabilities: Object.keys(this.capabilities.getRunnerCapabilities()).filter(
					(key) => this.capabilities.getRunnerCapabilities()[key]
				),
			},
			proposal: { status: state.agent.proposal?.status ?? 'idle' },
			diagnostic: state.error
				? { message: state.error.message.slice(0, 240), line: state.error.line, column: state.error.column }
				: undefined,
		});
	}

	private read(input: unknown): ToolResult<unknown> {
		const value = asRecord(input);
		if (!value || !onlyKeys(value, ['cursor', 'maxChars', 'revision']))
			return this.failure('VALIDATION_ERROR', 'Invalid read input', false);
		const cursor =
			value.cursor === undefined ? 0 : integer(value.cursor, 0, Number.MAX_SAFE_INTEGER) ? value.cursor : -1;
		const maxChars = value.maxChars === undefined ? 1000 : integer(value.maxChars, 256, 1000) ? value.maxChars : -1;
		if (cursor < 0 || maxChars < 0) return this.failure('VALIDATION_ERROR', 'cursor or maxChars is invalid', false);
		if (
			value.revision !== undefined &&
			(!integer(value.revision, 0, Number.MAX_SAFE_INTEGER) || value.revision !== this.capabilities.getRevision())
		)
			return this.failure('REVISION_CONFLICT', 'The sketch changed; read state again', true);
		const source = this.capabilities.getCode();
		const start = cursorBoundary(source, Math.min(cursor, source.length));
		const end = cursorBoundary(source, Math.min(source.length, start + maxChars));
		return this.success({
			revision: this.capabilities.getRevision(),
			start,
			end,
			totalChars: source.length,
			text: source.slice(start, end),
			nextCursor: end < source.length ? end : null,
		});
	}

	private listExamples(input: unknown): ToolResult<unknown> {
		const value = asRecord(input);
		if (!value || !onlyKeys(value, ['query', 'category', 'cursor', 'limit']))
			return this.failure('VALIDATION_ERROR', 'Invalid examples input', false);
		const query = value.query === undefined ? '' : text(value.query, 0, 80) ? value.query.toLowerCase() : null;
		const category = value.category === undefined ? undefined : text(value.category, 1, 80) ? value.category : null;
		const cursor = value.cursor === undefined ? 0 : integer(value.cursor, 0, 10000) ? value.cursor : -1;
		const limit = value.limit === undefined ? 5 : integer(value.limit, 1, 8) ? value.limit : -1;
		if (query === null || category === null || cursor < 0 || limit < 0)
			return this.failure('VALIDATION_ERROR', 'Invalid examples input', false);
		const examples = catalogExamples().filter(
			(example) =>
				(!category || example.category === category) &&
				(!query || `${example.title} ${example.category} ${example.description}`.toLowerCase().includes(query))
		);
		return this.success({
			items: examples.slice(cursor, cursor + limit),
			nextCursor: cursor + limit < examples.length ? cursor + limit : null,
		});
	}

	private async stageSketch(input: unknown, signal: AbortSignal): Promise<ToolResult<unknown>> {
		const value = asRecord(input);
		if (
			!value ||
			!onlyKeys(value, ['baseRevision', 'code', 'summary']) ||
			!integer(value.baseRevision, 0, Number.MAX_SAFE_INTEGER) ||
			!text(value.code, 1, 64_000) ||
			!text(value.summary, 1, 240)
		)
			return this.failure('VALIDATION_ERROR', 'baseRevision, code, or summary is invalid', false);
		const baseRevision = value.baseRevision as number;
		const code = value.code as string;
		const summary = value.summary as string;
		return this.queue.run(signal, async () => this.stage(baseRevision, code, summary, signal));
	}

	private async stageExample(input: unknown, signal: AbortSignal): Promise<ToolResult<unknown>> {
		const value = asRecord(input);
		if (
			!value ||
			!onlyKeys(value, ['exampleId', 'baseRevision', 'summary']) ||
			!text(value.exampleId, 1, 120) ||
			!integer(value.baseRevision, 0, Number.MAX_SAFE_INTEGER) ||
			(value.summary !== undefined && !text(value.summary, 1, 240))
		)
			return this.failure('VALIDATION_ERROR', 'Invalid example input', false);
		const example = catalogExamples().find((candidate) => candidate.id === value.exampleId);
		if (!example) return this.failure('VALIDATION_ERROR', 'Example does not exist', false);
		const baseRevision = value.baseRevision as number;
		const summary = (value.summary as string | undefined) ?? `Start from ${example.title}.`;
		return this.queue.run(signal, async () => this.stage(baseRevision, example.code, summary, signal));
	}

	private async stage(
		baseRevision: number,
		code: string,
		summary: string,
		signal: AbortSignal
	): Promise<ToolResult<unknown>> {
		if (this.isLocked())
			return this.failure('LOCKED_UNTRUSTED_SHARE', 'Unlock or discard the shared sketch first', false);
		if (baseRevision !== this.capabilities.getRevision())
			return this.failure('REVISION_CONFLICT', 'The sketch changed; get its latest revision', true);
		if (this.changes.getCandidate())
			return this.failure('PROPOSAL_IN_PROGRESS', 'A proposal is already awaiting review', true);
		const validation = await this.capabilities.validateCode(code, signal);
		if (!validation.valid)
			return this.failure(
				'VALIDATION_ERROR',
				validation.diagnostic?.message?.slice(0, 240) ?? 'Code has invalid syntax',
				false
			);
		if (signal.aborted) throw new DOMException('Operation aborted', 'AbortError');
		if (baseRevision !== this.capabilities.getRevision() || this.isLocked())
			return this.failure('REVISION_CONFLICT', 'The sketch changed before staging completed', true);
		const proposal = this.changes.stage({
			baseline: this.capabilities.getCode(),
			candidate: code,
			baseRevision,
			summary,
		});
		this.capabilities.setProposal(proposal);
		return this.success({
			proposalId: proposal.id,
			baseRevision,
			status: 'awaiting_user_review',
			changedLines: { added: proposal.addedLines, removed: proposal.removedLines },
			reviewVisible: true,
		});
	}

	private async inspect(input: unknown, signal: AbortSignal): Promise<ToolResult<unknown>> {
		const value = asRecord(input);
		if (
			!value ||
			!onlyKeys(value, ['detail', 'layerId', 'region', 'cursor']) ||
			(value.detail !== undefined && value.detail !== 'summary' && value.detail !== 'cells')
		)
			return this.failure('VALIDATION_ERROR', 'Invalid inspection input', false);
		if (!this.capabilities.getRunnerCapabilities().artworkInspection)
			return this.failure('UNSUPPORTED_CAPABILITY', 'Runner inspection is unavailable', true);
		try {
			return this.success(
				await this.capabilities.inspectArtwork({ ...value, detail: value.detail ?? 'summary' }, signal)
			);
		} catch {
			return this.failure('RUNTIME_ERROR', 'Artwork inspection failed', true);
		}
	}

	private async prepareExport(input: unknown, signal: AbortSignal): Promise<ToolResult<unknown>> {
		const value = asRecord(input);
		if (
			!value ||
			!onlyKeys(value, ['format', 'target', 'fileName']) ||
			!['png', 'svg', 'txt', 'json'].includes(String(value.format)) ||
			!['selected', 'all'].includes(String(value.target)) ||
			(value.fileName !== undefined && !text(value.fileName, 1, 80))
		)
			return this.failure('VALIDATION_ERROR', 'Invalid export input', false);
		if (this.isLocked())
			return this.failure('LOCKED_UNTRUSTED_SHARE', 'Unlock or discard the shared sketch first', false);
		try {
			const artifact = (await this.capabilities.prepareExport(value, signal)) as {
				format: 'png' | 'svg' | 'txt' | 'json';
				mimeType: string;
				fileName: string;
				data: ArrayBuffer | string;
			};
			const prepared = this.exports.prepare(artifact);
			this.capabilities.setPreparedExport(prepared);
			return this.success({
				artifactId: prepared.id,
				format: prepared.format,
				mimeType: prepared.mimeType,
				byteLength: prepared.byteLength,
				expiresAt: prepared.expiresAt,
				dialogOpen: true,
			});
		} catch {
			return this.failure('RUNTIME_ERROR', 'Export preparation failed', true);
		}
	}

	private prepareShare(input: unknown, _signal: AbortSignal): ToolResult<unknown> {
		if (!validEmpty(input)) return this.failure('VALIDATION_ERROR', 'This tool accepts no input', false);
		if (this.isLocked())
			return this.failure('LOCKED_UNTRUSTED_SHARE', 'Unlock or discard the shared sketch first', false);
		this.capabilities.openShare();
		return this.success({ revision: this.capabilities.getRevision(), dialogOpen: true });
	}

	private isLocked(): boolean {
		const share = this.capabilities.getState().share;
		return Boolean(share.payload && !share.consented);
	}
	private success<T>(data: T): ToolResult<T> {
		return { ok: true, data, stateRevision: this.capabilities.getRevision() };
	}
	private failure(code: ToolErrorCode, message: string, retryable: boolean): ToolResult<never> {
		return { ok: false, error: { code, message, retryable }, stateRevision: this.capabilities.getRevision() };
	}
}

function validEmpty(input: unknown): boolean {
	const record = asRecord(input);
	return record !== null && Object.keys(record).length === 0;
}
function budget(value: unknown): unknown {
	const serialized = JSON.stringify(value);
	return serialized.length <= MAX_RESULT_CHARS
		? value
		: {
				ok: false,
				error: {
					code: 'LIMIT_EXCEEDED',
					message: 'Result is too large; use pagination or a narrower region',
					retryable: true,
				},
				stateRevision: 0,
			};
}
function catalogExamples(): Array<{ id: string; title: string; category: string; description: string; code: string }> {
	const builtIn = EXAMPLE_LIBRARIES.flatMap((library) =>
		library.categories.flatMap((category) =>
			category.examples.map((example) => ({
				id: `example:${library.id}:${category.id}:${example.id}`,
				title: example.name,
				category: category.id,
				description: example.description.slice(0, 160),
				code: example.code,
			}))
		)
	);
	const gallery = getGallerySketchCatalog().map((sketch) => ({
		id: `gallery:${sketch.slug}`,
		title: sketch.title,
		category: 'gallery',
		description: (sketch.description ?? '').slice(0, 160),
		code: sketch.textmodeCode,
	}));
	return [...builtIn, ...gallery];
}
