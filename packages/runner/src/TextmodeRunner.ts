import { BaseRunner } from '@/core/runner/BaseRunner';
import { TextmodeManager } from '@/lib/TextmodeManager';
import { ExecutionContext } from '@/execution/ExecutionContext';
import { ErrorReporter } from '@/sandbox/errors/ErrorReporter';
import { FrameScheduler } from '@/sandbox/scheduling/FrameScheduler';
import { AudioReceiver } from '@/sandbox/scheduling/AudioReceiver';
import type {
	ParentToRunnerMessage,
	RunnerToParentMessage,
	AudioDataMessage,
	WindowToRunnerMessage,
} from '@synth.textmode.art/contracts/runner/textmode';
import { isInitMessage, isParentMessage } from '@synth.textmode.art/contracts/runner/textmode';

/**
 * Concrete runner for Textmode sketches.
 */
export class TextmodeRunner extends BaseRunner<RunnerToParentMessage> {
	private readonly errorReporter: ErrorReporter;
	private readonly scheduler: FrameScheduler;
	private readonly audioReceiver: AudioReceiver;
	private lastWorkingCode: string | null = null;
	private textmode: TextmodeManager;
	private context: ExecutionContext;
	private synthErrorReported = false;

	constructor() {
		super();
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
	}

	start(): void {
		this.setupGlobalErrorHandlers((error) => this.errorReporter.report(error as Error | string | Event));
		this.init();
		window.addEventListener('message', this.handleInitMessage);
	}

	private handleInitMessage = (event: MessageEvent<WindowToRunnerMessage>): void => {
		const msg = event.data;
		if (!isInitMessage(msg)) return;
		if (!this.isAllowedOrigin(event.origin)) return;
		if (event.source !== window.parent) return;
		const port = event.ports?.[0];
		if (!port) return;

		this.attachPort(port, this.handlePortMessage as (event: MessageEvent) => void);
		window.removeEventListener('message', this.handleInitMessage);
		this.sendMessage({ type: 'READY' });
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

		const reportInteraction = (): void => {
			this.sendMessage({ type: 'USER_INTERACTION' });
		};

		window.addEventListener('pointerdown', reportInteraction, { passive: true });

		// Listen for shortcuts (forward to host)
		window.addEventListener('keydown', (e) => {
			// Toggle UI: Ctrl + Shift + H
			if (e.ctrlKey && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
				e.preventDefault();
				this.sendMessage({ type: 'TOGGLE_UI' });
			}
		});

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
