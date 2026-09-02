export const TOOL_NAMES = [
	'textmode_get_editor_state',
	'textmode_read_sketch',
	'textmode_inspect_artwork',
	'textmode_stage_sketch',
	'textmode_list_examples',
	'textmode_stage_example',
	'textmode_prepare_export',
	'textmode_prepare_share',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];
export type ToolErrorCode =
	| 'NOT_READY'
	| 'UNSUPPORTED_CAPABILITY'
	| 'LOCKED_UNTRUSTED_SHARE'
	| 'REVISION_CONFLICT'
	| 'PROPOSAL_IN_PROGRESS'
	| 'VALIDATION_ERROR'
	| 'RUNTIME_ERROR'
	| 'LIMIT_EXCEEDED'
	| 'UNSUPPORTED_FORMAT'
	| 'ABORTED';

export type AgentProposalView = {
	id: string;
	summary: string;
	baseRevision: number;
	addedLines: number;
	removedLines: number;
	status: 'review' | 'previewing' | 'preview-ready' | 'preview-error';
	error?: string;
};

export type PreparedExportView = {
	id: string;
	format: 'png' | 'svg' | 'txt' | 'json';
	mimeType: string;
	byteLength: number;
	fileName: string;
	expiresAt: number;
};

export type AgentActivityEntry = {
	id: string;
	tool: string;
	status: 'pending' | 'success' | 'failure' | 'aborted';
	startedAt: number;
	durationMs?: number;
	message?: string;
};

export type ToolResult<T> =
	| { ok: true; data: T; stateRevision: number }
	| { ok: false; error: { code: ToolErrorCode; message: string; retryable: boolean }; stateRevision: number };
