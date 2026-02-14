import { BaseRunner } from '@/core/runner/BaseRunner';
import { TextmodeManager } from '@/engines/textmode/TextmodeManager';
import { ExecutionContext } from '@/engines/textmode/ExecutionContext';
import { ErrorReporter } from '@/engines/textmode/ErrorReporter';
import { FrameScheduler } from '@/engines/textmode/FrameScheduler';
import { AudioReceiver } from '@/engines/textmode/AudioReceiver';
import type {
	ParentToRunnerMessage,
	RunnerToParentMessage,
	AudioDataMessage,
	WindowToRunnerMessage,
} from '@synth.textmode.art/contracts/runner/textmode';
import { isInitMessage, isParentMessage } from '@synth.textmode.art/contracts/runner/textmode';

import { HandshakeHandler } from '@/core/transport/HandshakeHandler';

/**
 * Concrete engine implementation for Textmode sketches.
 */
export class TextmodeEngine extends BaseRunner<RunnerToParentMessage> {
	private readonly errorReporter: ErrorReporter;
	private readonly scheduler: FrameScheduler;
	private readonly audioReceiver: AudioReceiver;
	private readonly handshakeHandler: HandshakeHandler;
	private lastWorkingCode: string | null = null;
	private hasStarted = false;
	private textmode: TextmodeManager;
	private context: ExecutionContext;
	private synthErrorReported = false;
	private readonly handleUserInteraction = (): void => {
		this.sendMessage({ type: 'USER_INTERACTION' });
	};
	private readonly handleKeyDown = (event: KeyboardEvent): void => {
		if (event.ctrlKey && event.shiftKey && (event.key === 'H' || event.key === 'h')) {
			event.preventDefault();
			this.sendMessage({ type: 'TOGGLE_UI' });
		}
	};

	constructor(allowedParentOrigins: Set<string>) {
		super(allowedParentOrigins);
		this.errorReporter = new ErrorReporter((msg) => this.sendMessage(msg));
		this.audioReceiver = new AudioReceiver();
		this.scheduler = new FrameScheduler({
			isRendering: () => this.isRendering(),
			onExecute: (code, isSoftReset) => this.executeInternal(code, isSoftReset),
		});

		this.textmode = new TextmodeManager();
		this.context = new ExecutionContext({
			getTextmode: () => this.textmode.getInstance(),
			errorReporter: this.errorReporter,
			audioReceiver: this.audioReceiver,
		});

		this.handshakeHandler = new HandshakeHandler({
			isAllowedOrigin: (origin) => this.isAllowedOrigin(origin),
			isInitMessage: (data) => isInitMessage(data),
			onPortExtracted: (port) => {
				this.attachPort(port, this.handlePortMessage as (event: MessageEvent) => void);
			},
			onReady: () => {
				window.removeEventListener('message', this.handleInitMessage);
				this.sendMessage({ type: 'READY' });
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
			case 'AUDIO_DATA':
				this.audioReceiver.update(msg as AudioDataMessage);
				break;
		}
	};

	private scheduleCode(code: string, isSoftReset: boolean): void {
		this.scheduler.schedule({ code, isSoftReset });
	}

	private executeInternal(code: string, isSoftReset: boolean): void {
		this.execute(code, isSoftReset);
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
				this.sendMessage({
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
		this.detachPort();
	}

    /**
     * Check if Textmode is rendering (to prevent frame drops during execution)
     */
	isRendering(): boolean {
		return this.textmode.isRendering();
	}

    /**
     * Execute code
     */
	execute(code: string, isSoftReset: boolean): void {
		// Reset synth error flags
		this.synthErrorReported = false;

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
			const result = this.context.execute(code);

			if (result.success) {
				// Success!
				this.lastWorkingCode = code;
				this.sendMessage({ type: 'RUN_OK', timestamp: Date.now() });
			} else if (result.error) {
				// Runtime error
				this.errorReporter.report(new Error(result.error.message));

				// Attempt restore
				if (this.lastWorkingCode && this.lastWorkingCode !== code) {
					this.restoreLastWorking();
				}
			}
		} finally {
			this.textmode.resume();
		}
	}

    /**
     * Restore last working code
     */
	private restoreLastWorking(): void {
		if (!this.lastWorkingCode) return;

		try {
			this.textmode.cleanupLayers(false);
			const result = this.context.execute(this.lastWorkingCode);
			if (!result.success) {
				console.warn('Failed to restore last working code:', result.error?.message);
			}
		} catch (e) {
			console.warn('Error during restoration:', e);
		}
	}
}
