/**
 * Handles communication via MessagePort.
 * Encapsulates port attachment, message sending, and detachment.
 */
export class MessagePortTransport<TMessage = unknown> {
	private port: MessagePort | null = null;

	/**
	 * Attach a new MessagePort and set up message handling.
	 * Closes any previously attached port.
	 */
	attach(port: MessagePort, onMessage: (event: MessageEvent) => void): void {
		if (this.port) {
			this.port.close();
		}
		this.port = port;
		this.port.onmessage = onMessage;
		this.port.start();
	}

	/**
	 * Send a message through the port if it's attached.
	 */
	send(message: TMessage): void {
		if (!this.port) return;
		this.port.postMessage(message);
	}

	/**
	 * Close and detach the current MessagePort.
	 */
	detach(): void {
		if (!this.port) return;
		this.port.close();
		this.port = null;
	}

	/**
	 * Returns true if a MessagePort is currently attached.
	 */
	isAttached(): boolean {
		return Boolean(this.port);
	}
}
