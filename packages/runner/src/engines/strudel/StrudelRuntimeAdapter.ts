import {
	evaluate as evaluateStrudel,
	hush as hushStrudel,
	initAudio,
	initStrudel,
	registerZZFXSounds,
	samples as loadSamples,
} from '@strudel/web';
import type { StrudelPatternLike, StrudelReplLike, StrudelStateLike } from './strudel.types';

export class StrudelRuntimeAdapter {
	private repl: StrudelReplLike | null = null;
	private runtimeInitPromise: Promise<void> | null = null;
	private runtimeInitialized = false;
	private audioInitialized = false;

	async ensureRuntimeInitialized(onEvalError: (error: Error) => void): Promise<void> {
		if (this.runtimeInitialized) return;
		if (this.runtimeInitPromise) {
			await this.runtimeInitPromise;
			return;
		}

		this.runtimeInitPromise = (async () => {
			const repl = await initStrudel({
				autostart: false,
				onEvalError,
				prebake: async () => {
					const preloadTasks = [loadSamples('github:tidalcycles/dirt-samples'), registerZZFXSounds()];
					const results = await Promise.allSettled(preloadTasks);
					for (const result of results) {
						if (result.status === 'rejected') {
							console.warn('[StrudelRuntimeAdapter] Optional preload failed:', result.reason);
						}
					}
				},
			});
			this.repl = repl as unknown as StrudelReplLike;
			this.runtimeInitialized = true;
		})();

		try {
			await this.runtimeInitPromise;
		} finally {
			this.runtimeInitPromise = null;
		}
	}

	async initializeAudio(onEvalError: (error: Error) => void): Promise<void> {
		await this.ensureRuntimeInitialized(onEvalError);
		await initAudio();
		this.audioInitialized = true;
	}

	async evaluate(code: string, autostart: boolean): Promise<StrudelPatternLike | undefined> {
		// @strudel/web reports many eval/runtime failures via onEvalError and returns
		// undefined instead of throwing. Callers must treat undefined as failure.
		return await evaluateStrudel(code, autostart) as StrudelPatternLike | undefined;
	}

	hush(): void {
		if (!this.runtimeInitialized) return;
		hushStrudel();
		this.repl?.stop?.();
	}

	getCycle(): number {
		try {
			const scheduler = this.repl?.scheduler;
			if (scheduler && typeof scheduler.now === 'function') {
				const cycle = scheduler.now();
				if (Number.isFinite(cycle)) {
					return cycle;
				}
			}
		} catch {
			return 0;
		}
		return 0;
	}

	getMiniLocations(): StrudelStateLike['miniLocations'] | undefined {
		return this.repl?.state?.miniLocations;
	}

	isRuntimeInitialized(): boolean {
		return this.runtimeInitialized;
	}

	isAudioInitialized(): boolean {
		return this.audioInitialized;
	}
}
