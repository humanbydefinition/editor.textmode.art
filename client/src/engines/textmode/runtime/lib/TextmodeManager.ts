
import { textmode, Textmodifier } from 'textmode.js';
import { SynthPlugin, setGlobalErrorCallback } from 'textmode.synth.js';
import { createFiltersPlugin } from 'textmode.filters.js';
import type { ITextmodeManager, SynthLayer } from './textmode.types';

/**
 * TextmodeManager - manages the textmode.js instance lifecycle.
 * Handles initialization, resize, layer cleanup, and loop control.
 */
export class TextmodeManager implements ITextmodeManager {
	private instance: Textmodifier | null = null;

	/** Callback for synth dynamic parameter errors */
	private onSynthError?: (error: Error) => void;

	/**
	 * Get the textmode instance
	 */
	getInstance(): Textmodifier | null {
		return this.instance;
	}

	/**
	 * Initialize textmode and attach to DOM
	 */
	init(): void {
		if (this.instance) return;

		this.instance = textmode.create({
			width: window.innerWidth,
			height: window.innerHeight,
			plugins: [SynthPlugin, createFiltersPlugin()],
		});

		document.body.appendChild(this.instance.canvas);

		// Handle resize
		window.addEventListener('resize', this.handleResize);
	}

	/**
	 * Pause the animation loop
	 */
	pause(): void {
		this.instance?.noLoop();
	}

	/**
	 * Resume the animation loop
	 */
	resume(): void {
		this.instance?.loop();
	}

	/**
	 * Check if currently rendering a frame
	 */
	isRendering(): boolean {
		return this.instance?.isRenderingFrame ?? false;
	}

	/**
	 * Clean up layers before new execution
	 */
	cleanupLayers(isSoftReset: boolean): void {
		if (!this.instance) return;

		// Clear base layer's draw callback to prevent stale references
		try {
			this.instance.layers.base.draw(() => { });
		} catch {
			// Ignore - base layer might be in unexpected state
		}

		// Clear draw callbacks on all user layers
		for (const layer of this.instance.layers.all) {
			try {
				layer.draw(() => { });
			} catch {
				// Ignore - layer might be partially initialized
			}
		}

		this.clearAllSynths();

		try {
			this.instance.layers.clear();
		} catch (e) {
			// console.warn('Error clearing layers:', e);
		}

		// For soft reset, also reset frame count
		if (isSoftReset) {
			try {
				this.instance.frameCount = 0;
				this.instance.secs = 0;
			} catch {
				// Ignore time reset errors
			}
		}
	}

	/**
	 * Clear synths on all layers (base + user layers)
	 */
	clearAllSynths(): void {
		if (!this.instance) return;

		try {
			this.clearSynth(this.instance.layers.base);
			this.instance.layers.all.forEach((layer) => {
				this.clearSynth(layer);
			});
		} catch (e) {
			console.warn('Error clearing synths:', e);
		}
	}

	/**
	 * Clear synth on a layer (added by SynthPlugin)
	 */
	private clearSynth(layer: unknown): void {
		const synthLayer = layer as SynthLayer;
		if (typeof synthLayer.clearSynth === 'function') {
			synthLayer.clearSynth();
		}
	}

	/**
	 * Create a safe proxy for the textmode instance
	 * This is a pass-through; actual proxy creation is delegated to SafeProxyFactory
	 */
	createSafeProxy(): Textmodifier | null {
		return this.instance;
	}

	/**
	 * Handle window resize
	 */
	private handleResize = (): void => {
		if (this.instance) {
			this.instance.resizeCanvas(window.innerWidth, window.innerHeight);
		}
	};

	/**
	 * Set up a handler for synth dynamic parameter errors.
	 * Uses setGlobalErrorCallback from textmode.synth.js to route errors
	 * directly to the editor's error UI instead of the console.
	 *
	 * @param handler Callback function invoked when a synth error is detected
	 */
	setupSynthErrorHandler(handler: (error: Error) => void): void {
		this.onSynthError = handler;

		// Use the library's global error callback to route errors to our handler
		// This replaces the default console.warn behavior with our editor UI
		setGlobalErrorCallback((error: unknown, uniformName: string) => {
			const errorObj =
				error instanceof Error ? error : new Error(`Synth error in "${uniformName}": ${String(error)}`);

			this.onSynthError?.(errorObj);
		});
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		window.removeEventListener('resize', this.handleResize);

		// Clear the global synth error callback
		setGlobalErrorCallback(null);

		this.instance?.destroy();
	}
}
