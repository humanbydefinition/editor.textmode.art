// WebMCP imperative draft (2026-08-19): https://webmachinelearning.github.io/webmcp/
interface WebMcpTool {
	name: string;
	title: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
	execute: (input: unknown, context?: { signal?: AbortSignal }) => Promise<unknown>;
}

interface ModelContext {
	registerTool(tool: WebMcpTool, options: { signal: AbortSignal }): Promise<void>;
}

interface Document {
	modelContext?: ModelContext;
}
