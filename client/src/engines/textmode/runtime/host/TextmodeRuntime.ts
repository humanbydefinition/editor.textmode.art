
import type { ParentToRunnerMessage, AudioDataMessage, InitMessage } from '@/engines/textmode/sandbox/protocol';
import { isRunnerMessage, PROTOCOL_VERSION } from '@/engines/textmode/sandbox/protocol';
import type { IHostRuntime, HostRuntimeOptions } from '@/engines/textmode/sandbox/types';
import type { CodeError } from '@/types/app.types';
import type { AudioData } from '@/services/AudioService';

const HANDSHAKE_TIMEOUT_MS = 5000;

/**
 * TextmodeRuntime - manages the iframe lifecycle and communication from the parent window.
 */
export class TextmodeRuntime implements IHostRuntime {
	readonly strategy = 'sandboxed' as const;

	private iframe: HTMLIFrameElement | null = null;
	private container: HTMLElement;
	private _isReady = false;
	private pendingCode: string | null = null;
	private lastRequestedCode: string | null = null;
	private messagePort: MessagePort | null = null;
	private runnerOrigin: string;
	private handshakeTimer: number | null = null;
	private runnerUnavailable = false;

	private onReadyCallback?: () => void;
	private onRunOk?: (timestamp: number) => void;
	private onRunError?: (error: CodeError) => void;
	private onSynthError?: (error: CodeError) => void;
	private onUserInteractionCallback?: () => void;
	private onRunnerConnected?: () => void;
	private onRunnerDisconnected?: () => void;

	private options: HostRuntimeOptions;

	constructor(options: HostRuntimeOptions) {
		this.options = options;
		this.container = options.container;
		this.onReadyCallback = options.onReady;
		this.onRunOk = options.onRunOk;
		this.onRunError = options.onRunError;
		this.onSynthError = options.onSynthError;
		this.onRunnerConnected = options.onRunnerConnected;
		this.onRunnerDisconnected = options.onRunnerDisconnected;
		this.runnerOrigin = new URL(this.options.runnerUrl, window.location.origin).origin;
	}

	/**
	 * Create and initialize the iframe
	 */
	init(): void {
		this.createIframe();
	}

	/**
	 * Check if iframe is ready to receive code
	 */
	isReady(): boolean {
		return this._isReady;
	}

	/**
	 * Run code immediately
	 */
	forceRun(code: string): void {
		this.lastRequestedCode = code;
		if (!this._isReady) {
			this.pendingCode = code;
			return;
		}
		this.sendMessage({ type: 'RUN_CODE', code });
	}

	/**
	 * Soft reset - reset frameCount to 0 and re-run code
	 */
	softReset(code: string): void {
		this.lastRequestedCode = code;
		if (!this._isReady) {
			this.pendingCode = code;
			return;
		}
		this.sendMessage({ type: 'SOFT_RESET', code });
	}

	setOnUserInteraction(callback: (() => void) | undefined): void {
		this.onUserInteractionCallback = callback;
	}

	/**
	 * Manually retry loading the runner iframe.
	 */
	reconnect(): void {
		this.createIframe();
	}

	/**
	 * Trigger iframe activation from a trusted user gesture (e.g. click).
	 * Safari/WebKit may unlock full requestAnimationFrame cadence after this.
	 */
	activateFromUserGesture(): void {
		if (!this.iframe) return;
		this.iframe.tabIndex = -1;
		this.focusElement(this.iframe);

		try {
			this.iframe.contentWindow?.focus();
		} catch {
			// Ignore focus errors; element focus still helps on Safari.
		}
	}

	/**
	 * Cleanup
	 */
	dispose(): void {
		this.clearHandshakeTimer();
		if (this.messagePort) {
			this.messagePort.close();
			this.messagePort = null;
		}
		if (this.iframe) {
			this.iframe.removeEventListener('load', this.handleIframeLoad);
			this.iframe.removeEventListener('error', this.handleIframeError);
			this.iframe.remove();
		}
	}

	/**
	 * Send audio data to iframe for audio-reactive visuals
	 */
	sendAudioData(data: AudioData): void {
		if (!this._isReady) return;

		const msg: AudioDataMessage = {
			type: 'AUDIO_DATA',
			fft: data.fft,
			waveform: data.waveform,
			timestamp: data.timestamp,
		};
		this.sendMessage(msg);
	}

	/**
	 * Create a new iframe
	 */
	private createIframe(): void {
		// Remove existing iframe if any
		if (this.iframe) {
			this.iframe.removeEventListener('load', this.handleIframeLoad);
			this.iframe.removeEventListener('error', this.handleIframeError);
			this.iframe.remove();
			this.iframe = null;
		}

		this._isReady = false;
		this.clearHandshakeTimer();
		if (this.messagePort) {
			this.messagePort.close();
			this.messagePort = null;
		}

		// Create new iframe
		this.iframe = document.createElement('iframe');
		this.iframe.id = 'runner-frame';
		this.iframe.src = this.options.runnerUrl;
		this.iframe.style.opacity = '0';
		this.iframe.style.transition = 'opacity 140ms ease';

		// Sandbox permissions: allow scripts only
		this.iframe.sandbox.add('allow-scripts');
		this.iframe.referrerPolicy = 'no-referrer';
		this.iframe.addEventListener('load', this.handleIframeLoad);
		this.iframe.addEventListener('error', this.handleIframeError);

		this.container.appendChild(this.iframe);

		// Start the handshake timer immediately so we detect unavailability even
		// when the iframe's `load`/`error` events don't fire as expected (iOS Safari)
		// or when `contentWindow` is inaccessible for sandboxed cross-origin frames.
		this.startHandshakeTimer();
	}

	/**
	 * Handle messages from iframe via MessagePort
	 */
	private handlePortMessage = (event: MessageEvent): void => {
		const msg = event.data as unknown;
		if (!isRunnerMessage(msg)) return;

		switch (msg.type) {
			case 'READY':
				this._isReady = true;
				this.iframe?.style.setProperty('opacity', '1');
				this.clearHandshakeTimer();
				this.setRunnerUnavailable(false);
				this.onReadyCallback?.();
				// Run pending code if any
				if (this.pendingCode !== null) {
					this.forceRun(this.pendingCode);
					this.pendingCode = null;
				}
				break;

			case 'RUN_OK':
				this.onRunOk?.(msg.timestamp);
				break;

			case 'RUN_ERROR':
				this.onRunError?.({
					message: msg.message,
					stack: msg.stack,
					line: msg.line,
					column: msg.column,
				});
				break;

			case 'SYNTH_ERROR':
				this.onSynthError?.({
					message: msg.message,
				});
				break;

			case 'TOGGLE_UI':
				this.options.onToggleUI?.();
				break;

			case 'USER_INTERACTION':
				this.onUserInteractionCallback?.();
				break;
		}
	};

	private handleIframeLoad = (): void => {
		this.initializeMessagePort();
	};

	private handleIframeError = (): void => {
		this.handleRunnerUnavailable();
	};

	/**
	 * Send message to iframe
	 */
	private sendMessage(msg: ParentToRunnerMessage): void {
		if (!this.messagePort) return;
		this.messagePort.postMessage(msg);
	}

	private initializeMessagePort(): void {
		if (!this.iframe?.contentWindow) return;

		const channel = new MessageChannel();
		this.messagePort = channel.port1;
		this.messagePort.onmessage = this.handlePortMessage;
		this.messagePort.start();

		const initMessage: InitMessage = {
			type: 'INIT',
			v: PROTOCOL_VERSION,
		};
		const targetOrigin = import.meta.env.DEV ? '*' : this.runnerOrigin;
		this.iframe.contentWindow.postMessage(initMessage, targetOrigin, [channel.port2]);
		this.startHandshakeTimer();
	}

	private startHandshakeTimer(): void {
		this.clearHandshakeTimer();
		this.handshakeTimer = window.setTimeout(() => {
			this.handleRunnerUnavailable();
		}, HANDSHAKE_TIMEOUT_MS);
	}

	private clearHandshakeTimer(): void {
		if (this.handshakeTimer) {
			window.clearTimeout(this.handshakeTimer);
			this.handshakeTimer = null;
		}
	}

	private focusElement(element: HTMLElement): void {
		try {
			element.focus({ preventScroll: true });
		} catch {
			element.focus();
		}
	}

	private handleRunnerUnavailable(): void {
		this._isReady = false;
		this.clearHandshakeTimer();

		if (this.messagePort) {
			this.messagePort.close();
			this.messagePort = null;
		}

		if (this.pendingCode === null && this.lastRequestedCode !== null) {
			this.pendingCode = this.lastRequestedCode;
		}

		if (this.iframe) {
			this.iframe.removeEventListener('load', this.handleIframeLoad);
			this.iframe.removeEventListener('error', this.handleIframeError);
			this.iframe.remove();
			this.iframe = null;
		}

		this.setRunnerUnavailable(true);
	}

	private setRunnerUnavailable(isUnavailable: boolean): void {
		if (this.runnerUnavailable === isUnavailable) return;
		this.runnerUnavailable = isUnavailable;
		if (isUnavailable) {
			this.onRunnerDisconnected?.();
			return;
		}
		this.onRunnerConnected?.();
	}
}
