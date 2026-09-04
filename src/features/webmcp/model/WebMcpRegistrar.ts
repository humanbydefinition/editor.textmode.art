import { TOOL_NAMES, type ToolName } from './contracts';
import { toolDefinition } from './toolDefinitions';
import { type WebMcpToolService } from './WebMcpToolService';

/** Owns feature-detected, abortable registration in the top-level document only. */
export class WebMcpRegistrar {
	private controller: AbortController | null = null;
	private names: ToolName[] = [];
	private generation = 0;

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
		const modelContext = document.modelContext;
		if (!modelContext) {
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
		if (this.controller && same(this.names, desired)) return;
		this.dispose();
		const controller = new AbortController();
		const generation = this.generation;
		this.controller = controller;
		this.names = desired;
		this.onChange('registering', desired);

		const registrations = desired.map((name) => this.register(modelContext, name, controller.signal));
		void Promise.all(registrations).then(
			() => {
				if (!this.isCurrent(controller, generation)) return;
				this.onChange(desired.length === TOOL_NAMES.length ? 'ready' : 'limited', desired);
			},
			() => {
				// Disposal and a capability change deliberately abort the group. The draft API
				// rejects every pending registration in that case, which is an expected cleanup.
				if (!this.isCurrent(controller, generation) || controller.signal.aborted) return;
				controller.abort();
				this.controller = null;
				this.names = [];
				this.onChange('error', []);
			}
		);
	}

	dispose(): void {
		this.generation += 1;
		this.controller?.abort();
		this.controller = null;
		this.names = [];
	}

	private register(modelContext: ModelContext, name: ToolName, signal: AbortSignal): Promise<void> {
		try {
			// This is intentionally a direct top-level document API call, never an iframe capability.
				return Promise.resolve(
					modelContext.registerTool(
						toolDefinition(name, (inputValue, context) =>
							this.service.execute(name, inputValue, context?.signal)
						),
					{ signal }
				)
			);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	private isCurrent(controller: AbortController, generation: number): boolean {
		return this.controller === controller && this.generation === generation;
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
