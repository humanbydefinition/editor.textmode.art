import { parseAllowedParentOrigins } from '@/core/security/allowedParentOrigins';

export type GlobalErrorReporter = (error: unknown) => void;

export abstract class BaseRunner<TRunnerMessage> {
	protected messagePort: MessagePort | null = null;
	private readonly allowedParentOrigins: Set<string>;

	constructor() {
		this.allowedParentOrigins = new Set(
			parseAllowedParentOrigins(import.meta.env.VITE_RUNNER_PARENT_ORIGINS, import.meta.env.DEV)
		);
	}

	protected attachPort(port: MessagePort, onMessage: (event: MessageEvent) => void): void {
		if (this.messagePort) {
			this.messagePort.close();
		}
		this.messagePort = port;
		this.messagePort.onmessage = onMessage;
		this.messagePort.start();
	}

	protected sendMessage(message: TRunnerMessage): void {
		if (!this.messagePort) return;
		this.messagePort.postMessage(message);
	}

	protected isAllowedOrigin(origin: string): boolean {
		if (this.allowedParentOrigins.has('*')) return true;
		return this.allowedParentOrigins.has(origin);
	}

	protected setupGlobalErrorHandlers(reportError: GlobalErrorReporter): void {
		window.addEventListener('error', (event) => {
			reportError(event.error ?? event.message);
		});

		window.addEventListener('unhandledrejection', (event) => {
			reportError(event.reason);
		});
	}
}
