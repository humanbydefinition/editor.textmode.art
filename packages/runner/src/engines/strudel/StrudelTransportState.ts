import {
	createStrudelWindowEventEnvelope,
	isStrudelInitMessage,
	isStrudelParentMessage,
	type StrudelParentToRunnerMessage,
	type StrudelRunnerToParentMessage,
	type StrudelWindowToRunnerMessage,
} from '@synth.textmode.art/contracts/runner/strudel';
import { HandshakeHandler } from '@/core/transport/HandshakeHandler';
import { WindowFallbackChannel } from '@/core/transport/WindowFallbackChannel';

interface StrudelTransportStateOptions {
	isAllowedOrigin: (origin: string) => boolean;
	isPortAttached: () => boolean;
	attachPort: (port: MessagePort, onMessage: (event: MessageEvent) => void) => void;
	sendReady: () => void;
	handleParentMessage: (message: StrudelParentToRunnerMessage) => void;
}

export class StrudelTransportState {
	private readonly options: StrudelTransportStateOptions;
	private readonly handshakeHandler: HandshakeHandler;
	private readonly fallbackChannel: WindowFallbackChannel<StrudelRunnerToParentMessage>;

	constructor(options: StrudelTransportStateOptions) {
		this.options = options;
		this.fallbackChannel = new WindowFallbackChannel(createStrudelWindowEventEnvelope);
		this.handshakeHandler = new HandshakeHandler({
			isAllowedOrigin: (origin) => this.options.isAllowedOrigin(origin),
			isInitMessage: (data) => isStrudelInitMessage(data),
			onPortExtracted: (port) => {
				this.options.attachPort(port, this.onPortMessage as (event: MessageEvent) => void);
			},
			onReady: () => {
				this.options.sendReady();
			},
			onOriginEstablished: (origin) => {
				this.fallbackChannel.setParentOrigin(origin);
			},
		});
	}

	private onPortMessage: (event: MessageEvent<StrudelParentToRunnerMessage>) => void = () => {};

	getWindowMessageHandler(onPortMessage: (event: MessageEvent<StrudelParentToRunnerMessage>) => void) {
		this.onPortMessage = onPortMessage;
		const handshakeListener = this.handshakeHandler.createWindowMessageHandler();

		return (event: MessageEvent<StrudelWindowToRunnerMessage | StrudelParentToRunnerMessage>): void => {
			if (event.source !== window.parent) return;
			if (!this.options.isAllowedOrigin(event.origin)) return;

			const data = event.data;
			
			// Try handshake
			handshakeListener(event);

			// Window-message fallback path when MessagePort is unavailable.
			if (isStrudelParentMessage(data) && (data.type === 'STR_INIT_AUDIO' || !this.options.isPortAttached())) {
				this.options.handleParentMessage(data);
			}
		};
	}

	postWindowFallbackMessage(message: StrudelRunnerToParentMessage, isDev: boolean): void {
		this.fallbackChannel.postMessage(message, isDev);
	}
}
