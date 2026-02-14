import {
	isStrudelParentMessage,
	type StrudelAudioDataMessage,
	type StrudelParentToRunnerMessage,
	type StrudelRunnerToParentMessage,
} from '@synth.textmode.art/contracts/runner/strudel';
import { BaseRunner } from '@/core/runner/BaseRunner';
import { BroadcastTimerManager } from '@/engines/strudel/BroadcastTimerManager';
import { collectHapsFromPattern } from '@/engines/strudel/serialization/haps';
import { collectMiniLocationsFromPattern, serializeMiniLocations } from '@/engines/strudel/serialization/miniLocations';
import { StrudelRuntimeAdapter } from '@/engines/strudel/StrudelRuntimeAdapter';
import type { StrudelPatternLike } from '@/engines/strudel/strudel.types';
import { StrudelTransportState } from '@/engines/strudel/StrudelTransportState';
import { StrudelUnlockPromptManager } from '@/engines/strudel/StrudelUnlockPromptManager';
import { normalizeError } from '@/core/errors/normalizeError';

export class StrudelEngine extends BaseRunner<StrudelRunnerToParentMessage> {
	private readonly runtimeAdapter: StrudelRuntimeAdapter;
	private readonly timerManager: BroadcastTimerManager;
	private readonly unlockPrompt: StrudelUnlockPromptManager;
	private readonly transportState: StrudelTransportState;
	private readonly windowMessageHandler: (
		event: MessageEvent
	) => void;

	private currentPattern: StrudelPatternLike | null = null;
	private isPlaying = false;
	private pendingAutostartCode: string | null = null;
	private initAudioRequestPromise: Promise<void> | null = null;

	constructor(allowedParentOrigins: Set<string>) {
		super(allowedParentOrigins);
		this.runtimeAdapter = new StrudelRuntimeAdapter();
		this.timerManager = new BroadcastTimerManager({
			onCycleTick: () => this.sendPlayState(),
			onAudioTick: () => this.sendAudioData(),
			isPlaying: () => this.isPlaying,
		});
		this.unlockPrompt = new StrudelUnlockPromptManager({
			onUnlockClick: async () => this.handleUnlockButtonClick(),
		});
		this.transportState = new StrudelTransportState({
			isAllowedOrigin: (origin) => this.isAllowedOrigin(origin),
			isPortAttached: () => this.isPortAttached(),
			attachPort: (port, onMessage) => this.attachPort(port, onMessage),
			sendReady: () => this.sendReady(),
			handleParentMessage: (message) => {
				void this.handleParentMessage(message);
			},
		});
		this.windowMessageHandler = this.transportState.getWindowMessageHandler(this.handlePortMessage);
	}

	start(): void {
		this.unlockPrompt.setup();
		this.setupGlobalErrorHandlers((error) => this.sendRunError(error));
		window.addEventListener('message', this.windowMessageHandler);
	}

	private handlePortMessage = (event: MessageEvent<StrudelParentToRunnerMessage>): void => {
		const message = event.data;
		if (!isStrudelParentMessage(message)) return;
		void this.handleParentMessage(message);
	};

	private async handleParentMessage(message: StrudelParentToRunnerMessage): Promise<void> {
		switch (message.type) {
			case 'STR_INIT_AUDIO':
				await this.handleInitAudioRequest();
				break;
			case 'STR_RUN_CODE':
				await this.runCode(message.code, message.autostart ?? true);
				break;
			case 'STR_HUSH':
				this.hush();
				break;
			case 'STR_DISPOSE':
				this.dispose();
				break;
		}
	}

	private async handleInitAudioRequest(): Promise<void> {
		if (this.initAudioRequestPromise) {
			await this.initAudioRequestPromise;
			return;
		}

		this.initAudioRequestPromise = (async () => {
			if (this.runtimeAdapter.isAudioInitialized()) {
				this.unlockPrompt.hide();
				this.sendReady();
				return;
			}
			this.unlockPrompt.show();
			this.sendMessage({ type: 'STR_AUDIO_UNLOCK_REQUIRED' });
		})();

		try {
			await this.initAudioRequestPromise;
		} finally {
			this.initAudioRequestPromise = null;
		}
	}

	private async initializeAudio(): Promise<boolean> {
		try {
			await this.runtimeAdapter.initializeAudio((error) => this.sendRunError(error));
			this.unlockPrompt.hide();
			this.unlockPrompt.setStatus('');
			return true;
		} catch (error) {
			if (this.isUserActivationRequiredError(error)) {
				return false;
			}
			this.sendRunError(error);
			return false;
		}
	}

	private async runCode(code: string, autostart: boolean): Promise<void> {
		try {
			await this.runtimeAdapter.ensureRuntimeInitialized((error) => this.sendRunError(error));
			if (!this.runtimeAdapter.isAudioInitialized()) {
				if (autostart) {
					this.pendingAutostartCode = code;
				}

				const evaluatedPattern = await this.runtimeAdapter.evaluate(code, false);
				this.isPlaying = false;
				this.timerManager.stopCycleBroadcast();
				this.timerManager.stopAudioBroadcast();
				this.currentPattern = evaluatedPattern;

				const cycle = this.getCycle();
				const patternDerivedLocations = collectMiniLocationsFromPattern(evaluatedPattern);
				const miniLocations = serializeMiniLocations(this.runtimeAdapter.getMiniLocations());
				const haps = collectHapsFromPattern(evaluatedPattern, cycle);

				this.sendMessage({
					type: 'STR_RUN_OK',
					timestamp: Date.now(),
					miniLocations: patternDerivedLocations ?? miniLocations,
					haps,
					cycle,
					isPlaying: false,
				});
				this.sendPlayState();
				this.unlockPrompt.show();
				this.sendMessage({ type: 'STR_AUDIO_UNLOCK_REQUIRED' });
				return;
			}

			this.pendingAutostartCode = null;
			const evaluatedPattern = await this.runtimeAdapter.evaluate(code, autostart);
			this.isPlaying = autostart;
			if (this.isPlaying) {
				this.timerManager.startCycleBroadcast();
				this.timerManager.startAudioBroadcast();
			} else {
				this.timerManager.stopCycleBroadcast();
				this.timerManager.stopAudioBroadcast();
			}

			const cycle = this.getCycle();
			const patternDerivedLocations = collectMiniLocationsFromPattern(evaluatedPattern);
			const miniLocations = serializeMiniLocations(this.runtimeAdapter.getMiniLocations());
			const haps = collectHapsFromPattern(evaluatedPattern, cycle);
			this.currentPattern = evaluatedPattern;

			this.sendMessage({
				type: 'STR_RUN_OK',
				timestamp: Date.now(),
				miniLocations: patternDerivedLocations ?? miniLocations,
				haps,
				cycle,
				isPlaying: this.isPlaying,
			});
			this.sendPlayState();
		} catch (error) {
			this.sendRunError(error);
		}
	}

	private hush(): void {
		try {
			this.runtimeAdapter.hush();
		} catch (error) {
			this.sendRunError(error);
		} finally {
			this.isPlaying = false;
			this.currentPattern = null;
			this.pendingAutostartCode = null;
			this.timerManager.stopCycleBroadcast();
			this.timerManager.stopAudioBroadcast();
			if (this.runtimeAdapter.isAudioInitialized()) {
				this.unlockPrompt.hide();
			} else {
				this.unlockPrompt.show();
			}
			this.sendPlayState();
		}
	}

	private dispose(): void {
		this.hush();
		this.timerManager.dispose();
		window.removeEventListener('message', this.windowMessageHandler);
		this.unlockPrompt.dispose();
		this.teardownGlobalErrorHandlers();
		this.detachPort();
	}

	private sendReady(): void {
		this.sendMessage({
			type: 'STR_READY',
			runtimeInitialized: this.runtimeAdapter.isRuntimeInitialized(),
			audioInitialized: this.runtimeAdapter.isAudioInitialized(),
		});
	}

	private sendPlayState(): void {
		const cycle = this.getCycle();
		this.sendMessage({
			type: 'STR_PLAY_STATE',
			isPlaying: this.isPlaying,
			cycle,
			haps: collectHapsFromPattern(this.currentPattern ?? undefined, cycle),
		});
	}

	private getCycle(): number {
		return this.runtimeAdapter.getCycle();
	}

	private async handleUnlockButtonClick(): Promise<void> {
		const initialized = await this.initializeAudio();
		if (initialized) {
			this.unlockPrompt.hide();
			this.sendReady();
			if (this.pendingAutostartCode) {
				const pendingCode = this.pendingAutostartCode;
				this.pendingAutostartCode = null;
				await this.runCode(pendingCode, true);
			}
			return;
		}

		this.unlockPrompt.setButtonRetry();
		this.unlockPrompt.setStatus('audio is still blocked. tap once more.');
	}

	private isUserActivationRequiredError(error: unknown): boolean {
		if (!(error instanceof Error)) return false;
		const domLikeError = error as { name?: string };
		const name = domLikeError.name ?? '';
		const message = error.message.toLowerCase();
		return (
			name === 'NotAllowedError' ||
			name === 'InvalidStateError' ||
			message.includes('not allowed') ||
			message.includes('user gesture') ||
			message.includes('interaction')
		);
	}

	private sendAudioData(): void {
		// Prefer the same analyser registry Strudel exposes globally in the runner context.
		// This avoids module-instance mismatch issues across bundled dependency copies.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const globalAnalysers = (window as any).analysers as Record<string, AnalyserNode | undefined> | undefined;
		const analyser =
			globalAnalysers?.['main'] ??
			(globalAnalysers
				? Object.values(globalAnalysers).find((candidate): candidate is AnalyserNode => Boolean(candidate))
				: undefined);
		if (!analyser) return;

		const fft = new Uint8Array(analyser.frequencyBinCount);
		const waveform = new Uint8Array(analyser.fftSize);
		analyser.getByteFrequencyData(fft);
		analyser.getByteTimeDomainData(waveform);

		const message: StrudelAudioDataMessage = {
			type: 'STR_AUDIO_DATA',
			fft,
			waveform,
			timestamp: performance.now(),
		};
		this.sendMessage(message);
	}

	private sendRunError(error: unknown): void {
		const normalized = normalizeError(error);
		this.sendMessage({
			type: 'STR_RUN_ERROR',
			message: normalized.message,
			stack: normalized.stack,
			line: normalized.line,
			column: normalized.column,
		});
	}

	protected override sendMessage(message: StrudelRunnerToParentMessage): void {
		super.sendMessage(message);

		// Fallback channel for browsers where MessagePort runner->parent delivery is flaky.
		// Keep this limited to control/state messages to avoid duplicating high-rate FFT traffic.
		if (message.type !== 'STR_AUDIO_DATA') {
			this.postWindowMessage(message);
		}
	}

	private postWindowMessage(message: StrudelRunnerToParentMessage): void {
		this.transportState.postWindowFallbackMessage(message, import.meta.env.DEV);
	}

}
