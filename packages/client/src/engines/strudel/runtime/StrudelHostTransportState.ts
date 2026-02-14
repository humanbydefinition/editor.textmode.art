export class StrudelHostTransportState {
	private isReady = false;
	private isInitialized = false;
	private portInboundHealthy = false;
	private handshakeTimer: number | null = null;
	private readyPromise: Promise<void> | null = null;
	private readyResolver: (() => void) | null = null;
	private readyRejecter: ((reason: Error) => void) | null = null;
	private audioInitPromise: Promise<void> | null = null;
	private audioInitResolver: (() => void) | null = null;
	private audioInitRejecter: ((reason: Error) => void) | null = null;

	get ready(): boolean {
		return this.isReady;
	}

	get initialized(): boolean {
		return this.isInitialized;
	}

	get inboundPortHealthy(): boolean {
		return this.portInboundHealthy;
	}

	setInboundPortHealthy(healthy: boolean): void {
		this.portInboundHealthy = healthy;
	}

	resetConnectionState(): void {
		this.isReady = false;
		this.isInitialized = false;
		this.portInboundHealthy = false;
		this.clearAudioInitPromise();
	}

	markReady(audioInitialized: boolean): { wasReady: boolean; wasInitialized: boolean } {
		const wasReady = this.isReady;
		const wasInitialized = this.isInitialized;
		this.isReady = true;
		this.isInitialized = audioInitialized;
		return { wasReady, wasInitialized };
	}

	markHandshakeFailed(error: Error): void {
		this.isReady = false;
		this.isInitialized = false;
		this.rejectReady(error);
		this.rejectAudioInit(error);
	}

	waitUntilReady(): Promise<void> {
		if (this.isReady) return Promise.resolve();
		if (this.readyPromise) return this.readyPromise;

		this.readyPromise = new Promise<void>((resolve, reject) => {
			this.readyResolver = resolve;
			this.readyRejecter = reject;
		});
		return this.readyPromise;
	}

	resolveReady(): void {
		this.readyResolver?.();
		this.clearReadyPromise();
	}

	rejectReady(error: Error): void {
		this.readyRejecter?.(error);
		this.clearReadyPromise();
	}

	beginAudioInit(): Promise<void> {
		if (this.audioInitPromise) return this.audioInitPromise;

		this.audioInitPromise = new Promise<void>((resolve, reject) => {
			this.audioInitResolver = resolve;
			this.audioInitRejecter = reject;
		});
		return this.audioInitPromise;
	}

	hasAudioInitPromise(): boolean {
		return this.audioInitPromise !== null;
	}

	resolveAudioInit(): void {
		this.audioInitResolver?.();
		this.clearAudioInitPromise();
	}

	rejectAudioInit(error: Error): void {
		this.audioInitRejecter?.(error);
		this.clearAudioInitPromise();
	}

	clearAudioInitPromise(): void {
		this.audioInitPromise = null;
		this.audioInitResolver = null;
		this.audioInitRejecter = null;
	}

	startHandshakeTimer(timeoutMs: number, onTimeout: () => void): void {
		this.clearHandshakeTimer();
		this.handshakeTimer = window.setTimeout(onTimeout, timeoutMs);
	}

	clearHandshakeTimer(): void {
		if (this.handshakeTimer !== null) {
			window.clearTimeout(this.handshakeTimer);
			this.handshakeTimer = null;
		}
	}

	shouldRecreateRunner(hasMessagePort: boolean): boolean {
		return !this.isReady && !hasMessagePort && this.handshakeTimer === null;
	}

	dispose(disposeError: Error): void {
		this.clearHandshakeTimer();
		this.rejectReady(disposeError);
		this.rejectAudioInit(disposeError);
		this.clearAudioInitPromise();
		this.portInboundHealthy = false;
	}

	private clearReadyPromise(): void {
		this.readyPromise = null;
		this.readyResolver = null;
		this.readyRejecter = null;
	}
}
