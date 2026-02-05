import type { IFrameScheduler, PendingExecution } from '../types';

export interface FrameSchedulerOptions {
	/** Callback to check if currently rendering */
	isRendering: () => boolean;
	/** Callback to execute the code */
	onExecute: (code: string, isSoftReset: boolean) => void;
}

/**
 * Schedules code execution at safe frame boundaries
 */
export class FrameScheduler implements IFrameScheduler {
	private pendingExecution: PendingExecution | null = null;
	private executionGeneration = 0;
	private options: FrameSchedulerOptions;

	constructor(options: FrameSchedulerOptions) {
		this.options = options;
	}

	/**
	 * Schedule execution at the next safe frame boundary.
	 * Uses double-RAF to catch the very beginning of a frame.
	 */
	schedule(execution: PendingExecution): void {
		// Increment generation to invalidate any pending RAF chains
		const thisGeneration = ++this.executionGeneration;
		this.pendingExecution = execution;

		// First RAF: wait for current frame to complete its callback phase
		requestAnimationFrame(() => {
			if (thisGeneration !== this.executionGeneration) return;

			// Second RAF: now we're at the very start of the next frame,
			// before textmode's render loop has been called
			requestAnimationFrame(() => {
				if (thisGeneration !== this.executionGeneration) return;
				this.processPending();
			});
		});
	}

	/**
	 * Cancel any pending execution
	 */
	cancel(): void {
		this.executionGeneration++;
		this.pendingExecution = null;
	}

	/**
	 * Process pending execution when frame is safe
	 */
	private processPending(): void {
		if (!this.pendingExecution) return;

		// Double-check we're not mid-render
		if (this.options.isRendering()) {
			// Still rendering, try again next frame
			requestAnimationFrame(() => this.processPending());
			return;
		}

		const { code, isSoftReset } = this.pendingExecution;
		this.pendingExecution = null;
		this.options.onExecute(code, isSoftReset);
	}
}
