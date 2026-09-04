import type { ToolName } from './contracts';

const noInput = { type: 'object', properties: {}, additionalProperties: false };
const definitions: Record<ToolName, Omit<WebMcpTool, 'execute'>> = {
	textmode_get_editor_state: {
		name: 'textmode_get_editor_state',
		title: 'Get editor state',
		description: 'Read compact editor, runner, proposal, and diagnostic state.',
		inputSchema: noInput,
		annotations: { readOnlyHint: true, untrustedContentHint: true },
	},
	textmode_read_sketch: {
		name: 'textmode_read_sketch',
		title: 'Read sketch',
		description: 'Read accepted sketch source in bounded, revision-aware chunks.',
		inputSchema: {
			type: 'object',
			properties: {
				cursor: { type: 'integer', minimum: 0 },
				maxChars: { type: 'integer', minimum: 256, maximum: 1000 },
				revision: { type: 'integer', minimum: 0 },
			},
			additionalProperties: false,
		},
		annotations: { readOnlyHint: true, untrustedContentHint: true },
	},
	textmode_inspect_artwork: {
		name: 'textmode_inspect_artwork',
		title: 'Inspect artwork',
		description: 'Read bounded semantic canvas, layer, and cell data from the sandboxed runtime.',
		inputSchema: {
			type: 'object',
			properties: {
				detail: { enum: ['summary', 'cells'] },
				layerId: { type: 'string', minLength: 1, maxLength: 120 },
				region: {
					type: 'object',
					required: ['x', 'y', 'width', 'height'],
					properties: {
						x: { type: 'integer', minimum: 0 },
						y: { type: 'integer', minimum: 0 },
						width: { type: 'integer', minimum: 1, maximum: 64 },
						height: { type: 'integer', minimum: 1, maximum: 64 },
					},
					additionalProperties: false,
				},
				cursor: { type: 'integer', minimum: 0, maximum: 64 },
			},
			additionalProperties: false,
		},
		annotations: { readOnlyHint: true, untrustedContentHint: true },
	},
	textmode_stage_sketch: {
		name: 'textmode_stage_sketch',
		title: 'Stage sketch proposal',
		description: 'Syntax-check and stage a complete inert code proposal for visible human review.',
		inputSchema: {
			type: 'object',
			required: ['baseRevision', 'code', 'summary'],
			properties: {
				baseRevision: { type: 'integer', minimum: 0 },
				code: { type: 'string', maxLength: 64000 },
				summary: { type: 'string', minLength: 1, maxLength: 240 },
			},
			additionalProperties: false,
		},
		annotations: { untrustedContentHint: true },
	},
	textmode_list_examples: {
		name: 'textmode_list_examples',
		title: 'List examples',
		description: 'Find gallery sketch examples without returning their source.',
		inputSchema: {
			type: 'object',
			properties: {
				query: { type: 'string', maxLength: 80 },
				category: { type: 'string' },
				cursor: { type: 'integer', minimum: 0 },
				limit: { type: 'integer', minimum: 1, maximum: 8 },
			},
			additionalProperties: false,
		},
		annotations: { readOnlyHint: true, untrustedContentHint: true },
	},
	textmode_stage_example: {
		name: 'textmode_stage_example',
		title: 'Stage example',
		description: 'Stage a catalog example as an inert proposal for visible human review.',
		inputSchema: {
			type: 'object',
			required: ['exampleId', 'baseRevision'],
			properties: {
				exampleId: { type: 'string' },
				baseRevision: { type: 'integer', minimum: 0 },
				summary: { type: 'string', maxLength: 240 },
			},
			additionalProperties: false,
		},
		annotations: { untrustedContentHint: true },
	},
	textmode_prepare_export: {
		name: 'textmode_prepare_export',
		title: 'Prepare export',
		description: 'Prepare a bounded artwork artifact and open a human download dialog.',
		inputSchema: {
			type: 'object',
			required: ['format', 'target'],
			properties: {
				format: { enum: ['png', 'svg', 'txt', 'json'] },
				target: { enum: ['selected', 'all'] },
				fileName: { type: 'string', maxLength: 80 },
			},
			additionalProperties: false,
		},
		annotations: { untrustedContentHint: true },
	},
	textmode_prepare_share: {
		name: 'textmode_prepare_share',
		title: 'Prepare share',
		description: 'Open the existing share workflow without copying, navigating, or publishing.',
		inputSchema: noInput,
		annotations: { untrustedContentHint: true },
	},
};

export function toolDefinition(name: ToolName, execute: WebMcpTool['execute']): WebMcpTool {
	return { ...definitions[name], execute };
}
