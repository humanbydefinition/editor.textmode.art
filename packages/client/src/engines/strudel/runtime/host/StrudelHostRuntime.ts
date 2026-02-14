import type {
	StrudelHap,
	StrudelPattern,
	StrudelRuntimeOptions,
	IStrudelRuntime,
} from '../StrudelRuntime';
import {
	STRUDEL_PROTOCOL_VERSION,
	type StrudelParentToRunnerMessage,
	type StrudelRunnerToParentMessage,
	type StrudelHapDto,
	type StrudelInitMessage,
	type StrudelMiniLocationDto,
	isStrudelRunnerMessage,
} from '@/engines/strudel/sandbox/protocol';
import { clearStrudelAudioFrame, setStrudelAudioFrame } from '@/engines/strudel/audio/StrudelAudioFrameStore';
import {
	STRUDEL_UNLOCK_POPOVER_ALLOW_EVENT,
	STRUDEL_UNLOCK_POPOVER_DISMISS_EVENT,
	STRUDEL_UNLOCK_POPOVER_SUPPRESS_EVENT,
} from '@/platform/ui/popoverEvents';

const HANDSHAKE_TIMEOUT_MS = 5000;
const STRUDEL_RUNNER_OVERLAY_Z_INDEX = '460';
const STRUDEL_WINDOW_EVENT_TYPE = 'STRUDEL_RUNNER_EVENT';

export interface StrudelHostRuntimeOptions extends StrudelRuntimeOptions {
	runnerUrl: string;
	container?: HTMLElement;
}

export class StrudelHostRuntime implements IStrudelRuntime {
	readonly strategy = 'sandboxed' as const;

	private iframe: HTMLIFrameElement | null = null;
	private messagePort: MessagePort | null = null;
	private readonly options: StrudelHostRuntimeOptions;
	private readonly container: HTMLElement;
	private readonly runnerOrigin: string;

	private _isInitialized = false;
	private isReady = false;
	private isPlaying = false;
	private currentPattern: StrudelPattern | null = null;
	private latestHaps: StrudelHap[] = [];
	private currentCycle = 0;

	private pendingCode: string | null = null;
	private queuedCode: string | null = null;
	private handshakeTimer: number | null = null;
	private readyPromise: Promise<void> | null = null;
	private readyResolver: (() => void) | null = null;
	private readyRejecter: ((reason: Error) => void) | null = null;
	private audioInitPromise: Promise<void> | null = null;
	private audioInitResolver: (() => void) | null = null;
	private audioInitRejecter: ((reason: Error) => void) | null = null;
	private disposed = false;
	private portInboundHealthy = false;
	private unlockPopoverSuppressed = false;
	private readonly windowMessageListener: (event: MessageEvent) => void;
	private readonly dismissUnlockOverlayListener: () => void;
	private readonly suppressUnlockOverlayListener: () => void;
	private readonly allowUnlockOverlayListener: () => void;

	constructor(options: StrudelHostRuntimeOptions) {
		this.options = options;
		this.container = options.container ?? document.body;
		this.runnerOrigin = new URL(options.runnerUrl, window.location.origin).origin;
		this.windowMessageListener = (event: MessageEvent) => {
			this.handleWindowMessage(event);
		};
		this.dismissUnlockOverlayListener = () => {
			this.hideUnlockOverlay();
		};
		this.suppressUnlockOverlayListener = () => {
			this.unlockPopoverSuppressed = true;
			this.hideUnlockOverlay();
		};
		this.allowUnlockOverlayListener = () => {
			this.unlockPopoverSuppressed = false;
		};
		window.addEventListener('message', this.windowMessageListener);
		window.addEventListener(STRUDEL_UNLOCK_POPOVER_DISMISS_EVENT, this.dismissUnlockOverlayListener);
		window.addEventListener(STRUDEL_UNLOCK_POPOVER_SUPPRESS_EVENT, this.suppressUnlockOverlayListener);
		window.addEventListener(STRUDEL_UNLOCK_POPOVER_ALLOW_EVENT, this.allowUnlockOverlayListener);
		this.createIframe();
		// Warm up runner handshake so the first play click can unlock audio immediately.
		void this.waitUntilReady().catch(() => {
			// Intentionally silent: textmode runner availability handles global offline UX.
		});
	}

	async init(): Promise<void> {
		if (this.disposed) return;
		await this.ensureRunnerReady();
		await this.requestAudioInitialization();
	}

	isInitialized(): boolean {
		return this._isInitialized;
	}

	forceRun(code: string): void {
		if (this.disposed) return;
		if (!this._isInitialized) {
			this.showUnlockOverlay();
			void this.requestAudioInitialization().catch(() => {
				// Unlock failures are surfaced by runner/UI callbacks.
			});
		}
		if (!this.isReady) {
			this.pendingCode = code;
			return;
		}
		this.queuedCode = code;
		this.flushQueuedCode();
	}

	clearPendingCode(): void {
		this.pendingCode = null;
		this.queuedCode = null;
	}

	hush(): void {
		this.clearPendingCode();
		this.currentPattern = null;
		this.latestHaps = [];
		this.isPlaying = false;
		this.hideUnlockOverlay();
		clearStrudelAudioFrame();
		if (this.isReady) {
			this.sendMessage({ type: 'STR_HUSH' });
		}
		this.options.onPlayStateChange?.(false);
		this.options.onPatternUpdate?.(null);
	}

	dispose(): void {
		this.disposed = true;
		this.hush();
		this.clearHandshakeTimer();
		window.removeEventListener('message', this.windowMessageListener);
		window.removeEventListener(STRUDEL_UNLOCK_POPOVER_DISMISS_EVENT, this.dismissUnlockOverlayListener);
		window.removeEventListener(STRUDEL_UNLOCK_POPOVER_SUPPRESS_EVENT, this.suppressUnlockOverlayListener);
		window.removeEventListener(STRUDEL_UNLOCK_POPOVER_ALLOW_EVENT, this.allowUnlockOverlayListener);

		if (this.isReady) {
			this.sendMessage({ type: 'STR_DISPOSE' });
		}

		if (this.messagePort) {
			this.messagePort.close();
			this.messagePort = null;
		}

		if (this.iframe) {
			this.iframe.removeEventListener('load', this.handleIframeLoad);
			this.iframe.removeEventListener('error', this.handleIframeError);
			this.iframe.remove();
			this.iframe = null;
		}

		if (this.readyRejecter) {
			this.readyRejecter(new Error('Strudel runtime disposed'));
		}
		if (this.audioInitRejecter) {
			this.audioInitRejecter(new Error('Strudel runtime disposed'));
		}
		this.hideUnlockOverlay();
		clearStrudelAudioFrame();
		this.clearAudioInitPromise();
		this.readyPromise = null;
		this.readyResolver = null;
		this.readyRejecter = null;
	}

	getIsPlaying(): boolean {
		return this.isPlaying;
	}

	getPattern(): StrudelPattern | null {
		return this.currentPattern;
	}

	getCycle(): number {
		return this.currentCycle;
	}

	getTime(): number {
		return performance.now() / 1000;
	}

	private createIframe(): void {
		if (this.iframe) {
			this.iframe.removeEventListener('load', this.handleIframeLoad);
			this.iframe.removeEventListener('error', this.handleIframeError);
			this.iframe.remove();
			this.iframe = null;
		}

		if (this.messagePort) {
			this.messagePort.close();
			this.messagePort = null;
		}

		this.isReady = false;
		this._isInitialized = false;
		this.portInboundHealthy = false;
		this.clearAudioInitPromise();
		this.iframe = document.createElement('iframe');
		this.iframe.id = 'strudel-runner-frame';
		this.iframe.src = this.options.runnerUrl;
		this.iframe.style.position = 'fixed';
		this.iframe.style.top = 'calc(2rem + 8px)';
		this.iframe.style.right = '0.5rem';
		this.iframe.style.width = 'min(24rem, calc(100vw - 1rem))';
		this.iframe.style.height = '14rem';
		this.iframe.style.border = '0';
		this.iframe.style.background = 'rgba(9, 9, 11, 0.97)';
		this.iframe.style.borderRadius = '12px';
		this.iframe.style.overflow = 'hidden';
		this.iframe.style.opacity = '0';
		this.iframe.style.pointerEvents = 'none';
		this.iframe.style.visibility = 'hidden';
		this.iframe.style.zIndex = STRUDEL_RUNNER_OVERLAY_Z_INDEX;
		this.iframe.allow = 'autoplay';
		this.iframe.sandbox.add('allow-scripts');
		this.iframe.sandbox.add('allow-same-origin');
		this.iframe.referrerPolicy = 'no-referrer';
		this.iframe.addEventListener('load', this.handleIframeLoad);
		this.iframe.addEventListener('error', this.handleIframeError);
		this.container.appendChild(this.iframe);
		this.startHandshakeTimer();
	}

	private waitUntilReady(): Promise<void> {
		if (this.isReady) return Promise.resolve();
		if (this.readyPromise) return this.readyPromise;

		this.readyPromise = new Promise<void>((resolve, reject) => {
			this.readyResolver = resolve;
			this.readyRejecter = reject;
		});
		return this.readyPromise;
	}

	private flushQueuedCode(): void {
		if (!this.isReady || !this.messagePort) return;

		const code = this.queuedCode ?? this.pendingCode;
		if (code === null) return;
		this.queuedCode = null;
		this.pendingCode = null;
		this.sendMessage({ type: 'STR_RUN_CODE', code, autostart: true });
	}

	private async requestAudioInitialization(): Promise<void> {
		if (this._isInitialized) return;
		if (this.audioInitPromise) {
			await this.audioInitPromise;
			return;
		}

		this.showUnlockOverlay();
		await this.ensureRunnerReady();
		if (this._isInitialized) return;
		if (!this.messagePort) {
			return;
		}

		this.audioInitPromise = new Promise<void>((resolve, reject) => {
			this.audioInitResolver = resolve;
			this.audioInitRejecter = reject;
		});

		this.sendMessage({ type: 'STR_INIT_AUDIO' });
		await this.audioInitPromise;
	}

	private showUnlockOverlay(): void {
		if (!this.iframe) return;
		if (this.unlockPopoverSuppressed) return;
		this.iframe.style.visibility = 'visible';
		this.iframe.style.opacity = '1';
		this.iframe.style.pointerEvents = 'auto';
	}

	private hideUnlockOverlay(): void {
		if (!this.iframe) return;
		this.iframe.style.opacity = '0';
		this.iframe.style.pointerEvents = 'none';
		this.iframe.style.visibility = 'hidden';
	}

	private sendMessage(message: StrudelParentToRunnerMessage): void {
		if (this.messagePort) {
			this.messagePort.postMessage(message);
		}

		// Fallback for intermittent parent->runner port delivery: duplicate only init-audio,
		// which is idempotent and de-duplicated in the runner.
		if (message.type === 'STR_INIT_AUDIO' && this.iframe?.contentWindow) {
			const targetOrigin = import.meta.env.DEV ? '*' : this.runnerOrigin;
			this.iframe.contentWindow.postMessage(message, targetOrigin);
		}
	}

	private handleIframeLoad = (): void => {
		this.initializeMessagePort();
	};

	private handleIframeError = (): void => {
		this.failHandshake();
	};

	private initializeMessagePort(): void {
		if (!this.iframe?.contentWindow) return;

		const channel = new MessageChannel();
		this.messagePort = channel.port1;
		this.messagePort.onmessage = this.handlePortMessage;
		this.messagePort.start();

		const initMessage: StrudelInitMessage = {
			type: 'STR_INIT',
			v: STRUDEL_PROTOCOL_VERSION,
		};
		const targetOrigin = import.meta.env.DEV ? '*' : this.runnerOrigin;
		this.iframe.contentWindow.postMessage(initMessage, targetOrigin, [channel.port2]);
		this.startHandshakeTimer();
	}

	private handlePortMessage = (event: MessageEvent): void => {
		const message = event.data as unknown;
		if (!isStrudelRunnerMessage(message)) return;
		this.portInboundHealthy = true;
		this.processRunnerMessage(message);
	};

	private handleWindowMessage(event: MessageEvent): void {
		if (this.disposed) return;
		if (this.portInboundHealthy) return;
		if (!this.iframe?.contentWindow || event.source !== this.iframe.contentWindow) return;
		if (!import.meta.env.DEV && event.origin !== this.runnerOrigin) return;
		if (typeof event.data !== 'object' || event.data === null) return;

		const envelope = event.data as { type?: string; message?: unknown };
		if (envelope.type !== STRUDEL_WINDOW_EVENT_TYPE) return;
		if (!isStrudelRunnerMessage(envelope.message)) return;
		this.processRunnerMessage(envelope.message);
	}

	private processRunnerMessage(message: StrudelRunnerToParentMessage): void {
		switch (message.type) {
			case 'STR_READY':
				const wasReady = this.isReady;
				const wasInitialized = this._isInitialized;
				this.isReady = true;
				this._isInitialized = message.audioInitialized;
				if (message.audioInitialized) {
					this.hideUnlockOverlay();
				}
				this.clearHandshakeTimer();
				if (!wasReady && this.readyResolver) {
					this.readyResolver();
				}
				this.readyPromise = null;
				this.readyResolver = null;
				this.readyRejecter = null;
				if (message.audioInitialized) {
					this.audioInitResolver?.();
					this.clearAudioInitPromise();
					if (!wasInitialized) {
						this.options.onReady?.();
					}
				}
				this.flushQueuedCode();
				break;

			case 'STR_AUDIO_UNLOCK_REQUIRED':
				this.showUnlockOverlay();
				break;

			case 'STR_RUN_OK':
				if (typeof message.cycle === 'number') {
					this.currentCycle = message.cycle;
				}
				this.isPlaying = message.isPlaying;
				this.currentPattern = this.createPattern(message.haps, message.miniLocations);
				this.options.onPlayStateChange?.(this.isPlaying);
				this.options.onPatternUpdate?.(this.currentPattern);
				break;

			case 'STR_RUN_ERROR':
				if (this.audioInitRejecter) {
					this.audioInitRejecter(new Error(message.message));
					this.clearAudioInitPromise();
				}
				this.hideUnlockOverlay();
				this.options.onError?.({
					message: message.message,
					stack: message.stack,
					line: message.line,
					column: message.column,
				});
				break;

			case 'STR_PLAY_STATE':
				this.isPlaying = message.isPlaying;
				if (typeof message.cycle === 'number') {
					this.currentCycle = message.cycle;
				}
				if (message.haps) {
					this.updateLatestHaps(message.haps);
					if (!this.currentPattern && this.latestHaps.length > 0) {
						this.currentPattern = this.createLivePattern();
						this.options.onPatternUpdate?.(this.currentPattern);
					}
				}
				this.options.onPlayStateChange?.(this.isPlaying);
				if (!this.isPlaying) {
					this.currentPattern = null;
					this.latestHaps = [];
					clearStrudelAudioFrame();
					this.options.onPatternUpdate?.(null);
				}
				break;

			case 'STR_AUDIO_DATA':
				setStrudelAudioFrame({
					fft: message.fft,
					waveform: message.waveform,
					timestamp: message.timestamp,
				});
				break;
		}
	}

	private createPattern(
		haps: StrudelHapDto[] | undefined,
		miniLocations: StrudelMiniLocationDto[] | undefined
	): StrudelPattern | null {
		if (haps && haps.length > 0) {
			this.updateLatestHaps(haps);
			if (this.latestHaps.length > 0) {
				return this.createLivePattern();
			}
		}

		if (!miniLocations || miniLocations.length === 0) return null;

		const locations = miniLocations
			.map((location) => ({
				start: location.start.offset,
				end: location.end.offset,
			}))
			.filter((location) => Number.isFinite(location.start) && Number.isFinite(location.end) && location.start < location.end);

		if (locations.length === 0) return null;

		const beginValue = this.currentCycle;
		const safeEnd = beginValue + 0.25;
		this.latestHaps = locations.map((location) => ({
			whole: {
				begin: { valueOf: () => beginValue },
				end: { valueOf: () => safeEnd },
				duration: safeEnd - beginValue,
			},
			context: {
				locations: [{ start: location.start, end: location.end }],
			},
			hasOnset: () => true,
		}));
		return this.createLivePattern();
	}

	private updateLatestHaps(haps: StrudelHapDto[]): void {
		this.latestHaps = haps
			.filter((hap) => Number.isFinite(hap.begin) && Number.isFinite(hap.end) && hap.begin < hap.end)
			.map((hap) => {
				const locations = hap.locations
					.filter((location) => Number.isFinite(location.start) && Number.isFinite(location.end) && location.start < location.end)
					.map((location) => ({ start: location.start, end: location.end }));

				return {
					whole: {
						begin: { valueOf: () => hap.begin },
						end: { valueOf: () => hap.end },
						duration: hap.end - hap.begin,
					},
					context: {
						locations,
					},
					hasOnset: () => true,
				} satisfies StrudelHap;
			})
			.filter((hap) => (hap.context?.locations?.length ?? 0) > 0);
	}

	private createLivePattern(): StrudelPattern {
		return {
			queryArc: (begin: number, end: number): StrudelHap[] => {
				const beginValue = Number.isFinite(begin) ? begin : 0;
				const endValue = Number.isFinite(end) ? end : beginValue + 0.25;
				return this.latestHaps.filter((hap) => {
					const hapBegin = hap.whole?.begin.valueOf() ?? 0;
					const hapEnd = hap.whole?.end.valueOf() ?? 0;
					return hapEnd > beginValue && hapBegin < endValue;
				});
			},
		};
	}

	private startHandshakeTimer(): void {
		this.clearHandshakeTimer();
		this.handshakeTimer = window.setTimeout(() => {
			this.failHandshake();
		}, HANDSHAKE_TIMEOUT_MS);
	}

	private clearHandshakeTimer(): void {
		if (this.handshakeTimer !== null) {
			window.clearTimeout(this.handshakeTimer);
			this.handshakeTimer = null;
		}
	}

	private clearAudioInitPromise(): void {
		this.audioInitPromise = null;
		this.audioInitResolver = null;
		this.audioInitRejecter = null;
	}

	private async ensureRunnerReady(): Promise<void> {
		if (this.disposed) return;
		if (!this.iframe || this.shouldRecreateRunner()) {
			this.createIframe();
		}

		try {
			await this.waitUntilReady();
		} catch (firstError) {
			if (this.disposed) throw firstError;
			// Recover once from stale/failed hidden-frame handshakes.
			this.createIframe();
			await this.waitUntilReady();
		}
	}

	private shouldRecreateRunner(): boolean {
		return !this.isReady && !this.messagePort && this.handshakeTimer === null;
	}

	private failHandshake(): void {
		this.clearHandshakeTimer();
		this.isReady = false;
		this._isInitialized = false;
		this.hideUnlockOverlay();
		if (this.readyResolver) {
			this.readyResolver?.();
		}
		if (this.audioInitResolver) {
			this.audioInitResolver?.();
		}
		this.clearAudioInitPromise();
		this.readyPromise = null;
		this.readyResolver = null;
		this.readyRejecter = null;
	}
}
