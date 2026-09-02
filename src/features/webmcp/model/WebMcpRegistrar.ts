import { TOOL_NAMES, type ToolName } from './contracts';
import { toolDefinition } from './toolDefinitions';
import { type WebMcpToolService } from './WebMcpToolService';

/** Owns feature-detected, abortable registration in the top-level document only. */
export class WebMcpRegistrar {
	private controller: AbortController | null = null;
	private names: ToolName[] = [];

	private readonly service: WebMcpToolService;
	private readonly onChange: (
		state: 'unsupported' | 'registering' | 'ready' | 'limited' | 'error',
		names: string[]
	) => void;

	constructor(
		service: WebMcpToolService,
		onChange: (state: 'unsupported' | 'registering' | 'ready' | 'limited' | 'error', names: string[]) => void
	) {
		this.service = service;
		this.onChange = onChange;
	}

	reconcile(input: { initialized: boolean; locked: boolean; capabilities: Record<string, boolean> }): void {
		if (!document.modelContext) {
			this.dispose();
			this.onChange('unsupported', []);
			return;
		}
		if (!input.initialized) {
			this.dispose();
			this.onChange('registering', []);
			return;
		}
		const desired = TOOL_NAMES.filter((name) => available(name, input));
		if (same(this.names, desired)) return;
		this.dispose();
		this.controller = new AbortController();
		this.names = desired;
		this.onChange('registering', desired);
		try {
			for (const name of desired) {
				// This is intentionally a direct top-level document API call, never an iframe capability.
				void document.modelContext.registerTool(
					toolDefinition(name, (inputValue, context) =>
						this.service.execute(name, inputValue, context.signal)
					),
					{ signal: this.controller.signal }
				);
			}
			this.onChange(desired.length === TOOL_NAMES.length ? 'ready' : 'limited', desired);
		} catch {
			this.onChange('error', []);
		}
	}

	dispose(): void {
		this.controller?.abort();
		this.controller = null;
		this.names = [];
	}
}

function available(
	name: ToolName,
	input: { initialized: boolean; locked: boolean; capabilities: Record<string, boolean> }
): boolean {
	if (!input.initialized) return false;
	if (name === 'textmode_inspect_artwork') return input.capabilities.artworkInspection === true;
	if (name === 'textmode_prepare_export') return !input.locked && input.capabilities.exportPreparation === true;
	if (name === 'textmode_stage_sketch' || name === 'textmode_stage_example' || name === 'textmode_prepare_share')
		return !input.locked && input.capabilities.codeValidation === true;
	return true;
}
function same(a: ToolName[], b: ToolName[]): boolean {
	return a.length === b.length && a.every((name, index) => name === b[index]);
}
