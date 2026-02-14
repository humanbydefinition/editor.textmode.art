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
	isStrudelWindowEventEnvelope,
	isStrudelRunnerMessage,
} from '@synth.textmode.art/contracts/runner/strudel';
import { clearStrudelAudioFrame, setStrudelAudioFrame } from '@/engines/strudel/audio/StrudelAudioFrameStore';
import {
	STRUDEL_UNLOCK_POPOVER_ALLOW_EVENT,
	STRUDEL_UNLOCK_POPOVER_DISMISS_EVENT,
	STRUDEL_UNLOCK_POPOVER_SUPPRESS_EVENT,
} from '@/platform/ui/popoverEvents';
import { StrudelHostTransportState } from './StrudelHostTransportState';

const HANDSHAKE_TIMEOUT_MS = 5000;
const STRUDEL_RUNNER_OVERLAY_Z_INDEX = '460';

export class RunnerUnavailableError extends Error {
	constructor(message = 'Strudel runner is unavailable') {
		super(message);
		this.name = 'RunnerUnavailableError';
	}
}

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
	private readonly transportState = new StrudelHostTransportState();

	private isPlaying = false;
	private currentPattern: StrudelPattern | null = null;
	private latestHaps: StrudelHap[] = [];
	private currentCycle = 0;

	private pendingCode: string | null = null;
	private queuedCode: string | null = null;
	private disposed = false;
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
		return this.transportState.initialized;
	}

	forceRun(code: string): void {
		if (this.disposed) return;
		if (!this.transportState.initialized) {
			this.showUnlockOverlay();
			void this.requestAudioInitialization().catch(() => {
				// Unlock failures are surfaced by runner/UI callbacks.
			});
		}
		if (!this.transportState.ready) {
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
		if (this.transportState.ready) {
			this.sendMessage({ type: 'STR_HUSH' });
		}
		this.options.onPlayStateChange?.(false);
		this.options.onPatternUpdate?.(null);
	}

	dispose(): void {
		this.disposed = true;
		this.hush();
		this.transportState.clearHandshakeTimer();
		window.removeEventListener('message', this.windowMessageListener);
		window.removeEventListener(STRUDEL_UNLOCK_POPOVER_DISMISS_EVENT, this.dismissUnlockOverlayListener);
		window.removeEventListener(STRUDEL_UNLOCK_POPOVER_SUPPRESS_EVENT, this.suppressUnlockOverlayListener);
		window.removeEventListener(STRUDEL_UNLOCK_POPOVER_ALLOW_EVENT, this.allowUnlockOverlayListener);

		if (this.transportState.ready) {
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

		this.transportState.dispose(new Error('Strudel runtime disposed'));
		this.hideUnlockOverlay();
		clearStrudelAudioFrame();
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

		this.transportState.resetConnectionState();
		this.iframe = document.createElement('iframe');
		this.iframe.id = 'strudel-runner-frame';
		this.iframe.src = this.options.runnerUrl;
		this.iframe.style.position = 'fixed';
		this.iframe.style.top = 'calc(2rem + 8px)';
		this.iframe.style.right = '0.5rem';
		this.iframe.style.width = 'min(17rem, calc(100vw - 1rem))';
		this.iframe.style.height = '7.5rem';
		this.iframe.style.border = '0';
		this.iframe.style.background = 'transparent';
		this.iframe.style.borderRadius = '0';
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
		this.transportState.startHandshakeTimer(HANDSHAKE_TIMEOUT_MS, () => this.failHandshake());
	}

	private waitUntilReady(): Promise<void> {
		return this.transportState.waitUntilReady();
	}

	private flushQueuedCode(): void {
		if (!this.transportState.ready || !this.messagePort) return;

		const code = this.queuedCode ?? this.pendingCode;
		if (code === null) return;
		this.queuedCode = null;
		this.pendingCode = null;
		this.sendMessage({ type: 'STR_RUN_CODE', code, autostart: true });
	}

	private async requestAudioInitialization(): Promise<void> {
		if (this.transportState.initialized) return;
		if (this.transportState.hasAudioInitPromise()) {
			await this.transportState.beginAudioInit();
			return;
		}

		this.showUnlockOverlay();
		await this.ensureRunnerReady();
		if (this.transportState.initialized) return;
		if (!this.messagePort) {
			return;
		}

		const initPromise = this.transportState.beginAudioInit();
		this.sendMessage({ type: 'STR_INIT_AUDIO' });
		await initPromise;
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
			this.transportState.startHandshakeTimer(HANDSHAKE_TIMEOUT_MS, () => this.failHandshake());
		}

	private handlePortMessage = (event: MessageEvent): void => {
		const message = event.data as unknown;
		if (!isStrudelRunnerMessage(message)) return;
		this.transportState.setInboundPortHealthy(true);
		this.processRunnerMessage(message);
	};

	private handleWindowMessage(event: MessageEvent): void {
		if (this.disposed) return;
		if (this.transportState.inboundPortHealthy) return;
		if (!this.iframe?.contentWindow || event.source !== this.iframe.contentWindow) return;
		if (!import.meta.env.DEV && event.origin !== this.runnerOrigin) return;
		if (!isStrudelWindowEventEnvelope(event.data)) return;
		const envelope = event.data;
		this.processRunnerMessage(envelope.message);
	}

	private processRunnerMessage(message: StrudelRunnerToParentMessage): void {
		switch (message.type) {
			case 'STR_READY': {
				const { wasReady, wasInitialized } = this.transportState.markReady(message.audioInitialized);
				if (message.audioInitialized) {
					this.hideUnlockOverlay();
				}
				this.transportState.clearHandshakeTimer();
				if (!wasReady) {
					this.transportState.resolveReady();
				}
				if (message.audioInitialized) {
					this.transportState.resolveAudioInit();
					if (!wasInitialized) {
						this.options.onReady?.();
					}
				}
				this.flushQueuedCode();
				break;
			}

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
				this.transportState.rejectAudioInit(new Error(message.message));
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
		return this.transportState.shouldRecreateRunner(Boolean(this.messagePort));
	}

	private failHandshake(): void {
		this.transportState.clearHandshakeTimer();
		this.hideUnlockOverlay();
		this.transportState.markHandshakeFailed(new RunnerUnavailableError());
	}
}
