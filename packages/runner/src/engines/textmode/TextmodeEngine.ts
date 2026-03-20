import { MessagePortTransport } from '@/core/transport/MessagePortTransport';
import { TextmodeManager } from '@/engines/textmode/TextmodeManager';
import { ExecutionContext } from '@/engines/textmode/ExecutionContext';
import { ErrorReporter } from '@/engines/textmode/ErrorReporter';
import { FrameScheduler } from '@/engines/textmode/FrameScheduler';
import type {
	ParentToRunnerMessage,
	RunnerToParentMessage,
	WindowToRunnerMessage,
} from '@synth.textmode.art/contracts/runner/textmode';
import { isInitMessage, isParentMessage } from '@synth.textmode.art/contracts/runner/textmode';

import { HandshakeHandler } from '@/core/transport/HandshakeHandler';

/**
 * Concrete engine implementation for Textmode sketches.
 * Manages MessagePort communication, global error handling,
 * and the full textmode.js execution lifecycle inside the sandbox iframe.
 */
export class TextmodeEngine {
	private readonly transport = new MessagePortTransport<RunnerToParentMessage>();
	private readonly allowedParentOrigins: Set<string>;
	private readonly errorReporter: ErrorReporter;
	private readonly scheduler: FrameScheduler;
	private readonly handshakeHandler: HandshakeHandler;
	private lastWorkingCode: string | null = null;
	private hasStarted = false;
	private textmode: TextmodeManager;
	private context: ExecutionContext;
	private synthErrorReported = false;
	private isExecuting = false;
	private errorHandler: ((event: ErrorEvent) => void) | null = null;
	private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
	private readonly handleUserInteraction = (): void => {
		this.transport.send({ type: 'USER_INTERACTION' });
	};
	private readonly handleKeyDown = (event: KeyboardEvent): void => {
		if (event.ctrlKey && event.shiftKey && (event.key === 'H' || event.key === 'h')) {
			event.preventDefault();
			this.transport.send({ type: 'TOGGLE_UI' });
		}
	};

	constructor(allowedParentOrigins: Set<string>) {
		this.allowedParentOrigins = allowedParentOrigins;
		this.errorReporter = new ErrorReporter((msg) => this.transport.send(msg));
		this.scheduler = new FrameScheduler({
			isRendering: () => this.isRendering(),
			onExecute: (code, isSoftReset) => this.executeInternal(code, isSoftReset),
		});

		this.textmode = new TextmodeManager();
		this.context = new ExecutionContext({
			getTextmode: () => this.textmode.getInstance(),
			errorReporter: this.errorReporter,
		});

		this.handshakeHandler = new HandshakeHandler({
			isAllowedOrigin: (origin) => this.isAllowedOrigin(origin),
			isInitMessage: (data) => isInitMessage(data),
			onPortExtracted: (port) => {
				this.transport.attach(port, this.handlePortMessage as (event: MessageEvent) => void);
			},
			onReady: () => {
				window.removeEventListener('message', this.handleInitMessage);
				this.transport.send({ type: 'READY' });
			},
		});
	}

	start(): void {
		if (this.hasStarted) return;
		this.hasStarted = true;
		this.setupGlobalErrorHandlers((error) => this.errorReporter.report(error as Error | string | Event));
		this.init();
		window.addEventListener('message', this.handleInitMessage);
	}

	private isAllowedOrigin(origin: string): boolean {
		if (this.allowedParentOrigins.has('*')) return true;
		return this.allowedParentOrigins.has(origin);
	}

	private setupGlobalErrorHandlers(reportError: (error: unknown) => void): void {
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

	private teardownGlobalErrorHandlers(): void {
		if (this.errorHandler) {
			window.removeEventListener('error', this.errorHandler);
			this.errorHandler = null;
		}
		if (this.rejectionHandler) {
			window.removeEventListener('unhandledrejection', this.rejectionHandler);
			this.rejectionHandler = null;
		}
	}

	private handleInitMessage = (event: MessageEvent<WindowToRunnerMessage>): void => {
		this.handshakeHandler.createWindowMessageHandler()(event as MessageEvent);
	};

	private handlePortMessage = (event: MessageEvent<ParentToRunnerMessage>): void => {
		const msg = event.data;
		if (!isParentMessage(msg)) return;

		switch (msg.type) {
			case 'RUN_CODE':
				this.scheduleCode(msg.code, false);
				break;
			case 'SOFT_RESET':
				this.scheduleCode(msg.code, true);
				break;
			case 'DISPOSE':
				this.dispose();
				break;
		}
	};

	private scheduleCode(code: string, isSoftReset: boolean): void {
		this.scheduler.schedule({ code, isSoftReset });
	}

	private executeInternal(code: string, isSoftReset: boolean): void {
		void this.execute(code, isSoftReset);
	}

    /**
     * Initialize Textmode environment
     */
	init(): void {
		this.textmode.init();
		window.addEventListener('pointerdown', this.handleUserInteraction, { passive: true });
		window.addEventListener('keydown', this.handleKeyDown);

		// Setup synth error handler
		this.textmode.setupSynthErrorHandler((error) => {
			if (!this.synthErrorReported) {
				this.synthErrorReported = true;
				this.transport.send({
					type: 'SYNTH_ERROR',
					message: error.message,
				});
			}
		});
	}

	dispose(): void {
		if (!this.hasStarted) return;
		this.hasStarted = false;

		this.scheduler.cancel();
		this.context.dispose();
		this.textmode.dispose();
		this.synthErrorReported = false;

		window.removeEventListener('message', this.handleInitMessage);
		window.removeEventListener('pointerdown', this.handleUserInteraction);
		window.removeEventListener('keydown', this.handleKeyDown);

		this.teardownGlobalErrorHandlers();
		this.transport.detach();
	}

    /**
     * Check if Textmode is rendering (to prevent frame drops during execution)
     */
	isRendering(): boolean {
		return this.isExecuting || this.textmode.isRendering();
	}

    /**
     * Execute code
     */
	async execute(code: string, isSoftReset: boolean): Promise<void> {
		// Reset synth error flags
		this.synthErrorReported = false;
		this.isExecuting = true;

		// Pause animation
		this.textmode.pause();

		try {
			// Validate syntax
			const validation = this.context.validateSyntax(code);
			if (!validation.valid) {
				this.errorReporter.report(validation.error!);
				return;
			}

			// Cleanup layers
			this.textmode.cleanupLayers(isSoftReset);

			// Execute
			const result = await this.context.execute(code);

			if (result.success) {
				// Success!
				this.lastWorkingCode = code;
				this.transport.send({ type: 'RUN_OK', timestamp: Date.now() });
			} else if (result.error) {
				// Runtime error
				this.errorReporter.report(new Error(result.error.message));

				// Attempt restore
				if (this.lastWorkingCode && this.lastWorkingCode !== code) {
					await this.restoreLastWorking();
				}
			}
		} finally {
			this.isExecuting = false;
			this.textmode.resume();
		}
	}

    /**
     * Restore last working code
     */
	private async restoreLastWorking(): Promise<void> {
		if (!this.lastWorkingCode) return;

		try {
			this.textmode.cleanupLayers(false);
			const result = await this.context.execute(this.lastWorkingCode);
			if (!result.success) {
				console.warn('Failed to restore last working code:', result.error?.message);
			}
		} catch (e) {
			console.warn('Error during restoration:', e);
		}
	}
}
