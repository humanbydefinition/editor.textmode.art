import { parseAllowedParentOrigins } from '@/core/security/allowedParentOrigins';

export type GlobalErrorReporter = (error: unknown) => void;

export abstract class BaseRunner<TRunnerMessage> {
	protected messagePort: MessagePort | null = null;
	private readonly allowedParentOrigins: Set<string>;
	private errorHandler: ((event: ErrorEvent) => void) | null = null;
	private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

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

	protected detachPort(): void {
		if (!this.messagePort) return;
		this.messagePort.close();
		this.messagePort = null;
	}

	protected isAllowedOrigin(origin: string): boolean {
		if (this.allowedParentOrigins.has('*')) return true;
		return this.allowedParentOrigins.has(origin);
	}

	protected setupGlobalErrorHandlers(reportError: GlobalErrorReporter): void {
		this.teardownGlobalErrorHandlers();

		this.errorHandler = (event: ErrorEvent) => {
			reportError(event.error ?? event.message);
		};

		this.rejectionHandler = (event: PromiseRejectionEvent) => {
			reportError(event.reason);
		};

		window.addEventListener('error', this.errorHandler);
		window.addEventListener('unhandledrejection', this.rejectionHandler);
	}

	protected teardownGlobalErrorHandlers(): void {
		if (this.errorHandler) {
			window.removeEventListener('error', this.errorHandler);
			this.errorHandler = null;
		}

		if (this.rejectionHandler) {
			window.removeEventListener('unhandledrejection', this.rejectionHandler);
			this.rejectionHandler = null;
		}
	}
}
