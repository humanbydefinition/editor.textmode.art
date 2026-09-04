import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebMcpRegistrar } from './WebMcpRegistrar';
import type { WebMcpToolService } from './WebMcpToolService';

const originalModelContext = Object.getOwnPropertyDescriptor(document, 'modelContext');

afterEach(() => {
	if (originalModelContext) Object.defineProperty(document, 'modelContext', originalModelContext);
	else delete (document as Document & { modelContext?: ModelContext }).modelContext;
});

describe('WebMcpRegistrar', () => {
	it('reports ready only after every tool has registered', async () => {
		const resolveRegistration: Array<() => void> = [];
		const registerTool = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveRegistration.push(resolve);
				})
		);
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: { registerTool },
		});
		const onChange = vi.fn();
		const registrar = new WebMcpRegistrar({} as WebMcpToolService, onChange);

		registrar.reconcile({ initialized: true, locked: false, capabilities: {} });
		expect(onChange).toHaveBeenLastCalledWith('registering', [
			'textmode_get_editor_state',
			'textmode_read_sketch',
			'textmode_list_examples',
		]);

		for (const resolve of resolveRegistration) resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(onChange).toHaveBeenLastCalledWith('limited', [
			'textmode_get_editor_state',
			'textmode_read_sketch',
			'textmode_list_examples',
		]);
	});

	it('does not let a stale registration generation overwrite the current state', async () => {
		const resolveRegistration: Array<() => void> = [];
		const registerTool = vi.fn(
			(_tool: WebMcpTool, { signal }: { signal: AbortSignal }) =>
				new Promise<void>((resolve, reject) => {
					resolveRegistration.push(resolve);
					signal.addEventListener('abort', () => reject(signal.reason), { once: true });
				})
		);
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: { registerTool },
		});
		const onChange = vi.fn();
		const registrar = new WebMcpRegistrar({} as WebMcpToolService, onChange);

		registrar.reconcile({ initialized: true, locked: false, capabilities: {} });
		registrar.reconcile({
			initialized: true,
			locked: false,
			capabilities: { artworkInspection: true, codeValidation: true, exportPreparation: true },
		});
		for (const resolve of resolveRegistration) resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(onChange).toHaveBeenLastCalledWith('ready', expect.arrayContaining(['textmode_prepare_export']));
		expect(onChange).not.toHaveBeenLastCalledWith('limited', expect.anything());
	});

	it('handles registration promises rejected by disposal', async () => {
		const rejections: unknown[] = [];
		const registerTool = vi.fn((_tool: WebMcpTool, { signal }: { signal: AbortSignal }) => {
			const registration = new Promise<void>((_resolve, reject) => {
				signal.addEventListener('abort', () => reject(signal.reason), { once: true });
			});
			const originalThen = registration.then.bind(registration);
			Object.defineProperty(registration, 'then', {
				value: vi.fn((onFulfilled, onRejected) =>
					originalThen(onFulfilled, (reason) => {
						rejections.push(reason);
						return onRejected?.(reason);
					})
				),
			});
			return registration;
		});
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: { registerTool },
		});
		const registrar = new WebMcpRegistrar({} as WebMcpToolService, vi.fn());
		registrar.reconcile({ initialized: true, locked: false, capabilities: {} });
		registrar.dispose();

		await new Promise((resolve) => window.setTimeout(resolve));
		expect(registerTool).toHaveBeenCalledTimes(3);
		expect(rejections.length).toBeGreaterThanOrEqual(3);
	});

	it('forwards calls from bridges that do not provide execution options', async () => {
		const tools: WebMcpTool[] = [];
		const registerTool = vi.fn((tool: WebMcpTool) => {
			tools.push(tool);
			return Promise.resolve();
		});
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: { registerTool },
		});
		const execute = vi.fn(async () => ({ ok: true }));
		const registrar = new WebMcpRegistrar({ execute } as unknown as WebMcpToolService, vi.fn());

		registrar.reconcile({ initialized: true, locked: false, capabilities: {} });
		await tools[0]!.execute({});

		expect(execute).toHaveBeenCalledWith('textmode_get_editor_state', {}, undefined);
	});
});
