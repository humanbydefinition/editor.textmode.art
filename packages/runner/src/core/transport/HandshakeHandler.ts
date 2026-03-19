/**
 * Options for the HandshakeHandler.
 */
export interface HandshakeHandlerOptions {
	/** Callback to check if the message origin is allowed */
	isAllowedOrigin: (origin: string) => boolean;
	/** Type guard to check if a message is an initialization message */
	isInitMessage: (data: unknown) => boolean;
	/** Callback to attach the extracted MessagePort */
	onPortExtracted: (port: MessagePort) => void;
	/** Callback to signal that the handshake is complete and the runner is ready */
	onReady: () => void;
	/** Optional callback to handle the origin of the parent once it's established */
	onOriginEstablished?: (origin: string) => void;
}

/**
 * Handles the initial handshake between the parent window and the iframe runner.
 * Validates the parent's identity, extracts the MessagePort, and signals readiness.
 */
export class HandshakeHandler {
	private readonly options: HandshakeHandlerOptions;

	constructor(options: HandshakeHandlerOptions) {
		this.options = options;
	}

	/**
	 * Creates a message listener for the window 'message' event to handle the handshake.
	 */
	createWindowMessageHandler() {
		return (event: MessageEvent): void => {
			// 1. Security check: must come from the parent window
			if (event.source !== window.parent) return;

			// 2. Security check: origin must be in the allowed list
			if (!this.options.isAllowedOrigin(event.origin)) return;

			// 3. Check if it's an initialization message
			const data = event.data;
			if (this.options.isInitMessage(data)) {
				const port = event.ports?.[0];
				if (!port) return;

				// 4. Establish origin and attach port
				if (this.options.onOriginEstablished) {
					this.options.onOriginEstablished(event.origin);
				}
				
				this.options.onPortExtracted(port);

				// 5. Signal readiness
				this.options.onReady();
			}
		};
	}
}
