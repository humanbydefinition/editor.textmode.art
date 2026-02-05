import { AbstractRunner } from '@/sandbox/AbstractRunner';
import { TextmodeManager } from '../runtime/lib/TextmodeManager';
import { ExecutionContext } from './execution/ExecutionContext';

/**
 * Concrete runner for Textmode sketches.
 */
export class TextmodeRunner extends AbstractRunner {
	private textmode: TextmodeManager;
	private context: ExecutionContext;
	private synthErrorReported = false;

	constructor() {
		super();
		this.textmode = new TextmodeManager();
		this.context = new ExecutionContext({
			getTextmode: () => this.textmode.getInstance(),
			errorReporter: this.errorReporter,
			audioReceiver: this.audioReceiver,
		});
	}

	/**
	 * Initialize Textmode environment
	 */
	init(): void {
		this.textmode.init();

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
