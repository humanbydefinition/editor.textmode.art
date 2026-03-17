/**
 * Handles sending messages via window.parent.postMessage as a fallback
 * when MessagePort communication is unavailable or unreliable.
 */
export class WindowFallbackChannel<TMessage = unknown> {
	private activeParentOrigin: string | null = null;
	private readonly envelopeCreator?: (message: TMessage) => unknown;

	constructor(envelopeCreator?: (message: TMessage) => unknown) {
		this.envelopeCreator = envelopeCreator;
	}

	/**
	 * Sets the origin of the parent window once it's been established (usually during handshake).
	 */
	setParentOrigin(origin: string): void {
		this.activeParentOrigin = origin;
	}

	/**
	 * Sends a message via window.parent.postMessage.
	 */
	postMessage(message: TMessage, isDev: boolean): void {
		if (window.parent === window) return;

		const targetOrigin = this.activeParentOrigin ?? (isDev ? '*' : window.location.origin);
		const payload = this.envelopeCreator ? this.envelopeCreator(message) : message;

		window.parent.postMessage(payload, targetOrigin);
	}
}
