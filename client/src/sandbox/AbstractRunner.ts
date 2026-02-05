/**
 * AbstractRunner - Base class for iframe runners.
 * Handles communication with the parent window, error reporting, and frame scheduling.
 */
import { ErrorReporter } from './errors/ErrorReporter';
import { FrameScheduler } from './scheduling/FrameScheduler';
import { AudioReceiver } from './scheduling/AudioReceiver';
import type { ParentToRunnerMessage, RunnerToParentMessage, AudioDataMessage } from './protocol';

/**
 * Interface that concrete runners must implement
 */
export interface RunnerImplementation {
	/** Initialize the execution environment */
	init(): void;

	/** Execute code string */
	execute(code: string, isSoftReset: boolean): void;

	/** Clean up resources */
	dispose?(): void;

	/** Check if currently rendering/busy (for scheduler) */
	isRendering(): boolean;
}

/**
 * Abstract base class for runners
 */
export abstract class AbstractRunner implements RunnerImplementation {
	protected errorReporter: ErrorReporter;
	protected scheduler: FrameScheduler;
	protected audioReceiver: AudioReceiver;

	/** Last successfully executed code (for reference, concrete classes might use this) */
	protected lastWorkingCode: string | null = null;

	constructor() {
		this.errorReporter = new ErrorReporter();
		this.audioReceiver = new AudioReceiver();

		this.scheduler = new FrameScheduler({
			isRendering: () => this.isRendering(),
			onExecute: (code, isSoftReset) => this.executeInternal(code, isSoftReset),
		});
	}

	/**
	 * Start the runner
	 */
	public start(): void {
		this.setupErrorHandlers();
		this.init();

		window.addEventListener('message', this.handleMessage);
		this.sendMessage({ type: 'READY' });
	}

	/**
	 * Abstract: Initialize environment (e.g. create managers, layers)
	 */
	abstract init(): void;

	/**
	 * Abstract: Check if rendering is in progress (to prevent frame drops)
	 */
	abstract isRendering(): boolean;

	/**
	 * Abstract: Execute the code.
	 * Concrete implementations should handle parsing, context creation, and running.
	 * They should also manage `lastWorkingCode` and call `sendMessage({ type: 'RUN_OK' })` on success.
	 */
	abstract execute(code: string, isSoftReset: boolean): void;

	/**
	 * Handle internal execution from scheduler
	 */
	protected executeInternal(code: string, isSoftReset: boolean): void {
		this.execute(code, isSoftReset);
	}

	/**
	 * Handle messages from parent window
	 */
	protected handleMessage = (event: MessageEvent<ParentToRunnerMessage>): void => {
		const msg = event.data;
		if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

		switch (msg.type) {
			case 'RUN_CODE':
				this.scheduleCode(msg.code, false);
				break;
			case 'SOFT_RESET':
				this.scheduleCode(msg.code, true);
				break;
			case 'AUDIO_DATA':
				this.audioReceiver.update(msg as AudioDataMessage);
				this.onAudioData(msg as AudioDataMessage);
				break;
		}
	};

	/**
	 * Optional hook for audio data handling
	 */
	/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
	protected onAudioData(_data: AudioDataMessage): void { }

	/**
	 * Schedule code for execution via FrameScheduler
	 */
	protected scheduleCode(code: string, isSoftReset: boolean): void {
		this.scheduler.schedule({ code, isSoftReset });
	}

	/**
	 * Send message to parent window
	 */
	protected sendMessage(msg: RunnerToParentMessage): void {
		window.parent.postMessage(msg, '*');
	}

	/**
	 * Setup global error handlers
	 */
	protected setupErrorHandlers(): void {
		window.addEventListener('error', (event) => {
			const error = event.error;
			const message = error?.message || String(event.message);

			this.errorReporter.report(error || message);
		});

		window.addEventListener('unhandledrejection', (event) => {
			const reason = event.reason;

			this.errorReporter.report(reason);
		});
	}
}
