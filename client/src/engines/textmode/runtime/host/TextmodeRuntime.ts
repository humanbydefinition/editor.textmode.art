
import type { ParentToRunnerMessage, AudioDataMessage, InitMessage } from '@/sandbox/protocol';
import { isRunnerMessage, PROTOCOL_VERSION } from '@/sandbox/protocol';
import type { IHostRuntime, HostRuntimeOptions } from '@/sandbox/types';
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
	private messagePort: MessagePort | null = null;
	private runnerOrigin: string;
	private handshakeTimer: number | null = null;

	private onReadyCallback?: () => void;
	private onRunOk?: (timestamp: number) => void;
	private onRunError?: (error: CodeError) => void;
	private onSynthError?: (error: CodeError) => void;

	private options: HostRuntimeOptions;

	constructor(options: HostRuntimeOptions) {
		this.options = options;
		this.container = options.container;
		this.onReadyCallback = options.onReady;
		this.onRunOk = options.onRunOk;
		this.onRunError = options.onRunError;
		this.onSynthError = options.onSynthError;
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
		if (!this._isReady) {
			this.pendingCode = code;
			return;
		}
		this.sendMessage({ type: 'SOFT_RESET', code });
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

		// Sandbox permissions: allow scripts only
		this.iframe.sandbox.add('allow-scripts');
		this.iframe.referrerPolicy = 'no-referrer';
		this.iframe.addEventListener('load', this.handleIframeLoad);

		this.container.appendChild(this.iframe);
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
				this.clearHandshakeTimer();
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
		}
	};

	private handleIframeLoad = (): void => {
		this.initializeMessagePort();
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
			this.createIframe();
		}, HANDSHAKE_TIMEOUT_MS);
	}

	private clearHandshakeTimer(): void {
		if (this.handshakeTimer) {
			window.clearTimeout(this.handshakeTimer);
			this.handshakeTimer = null;
		}
	}
}
