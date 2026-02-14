import {
	createStrudelWindowEventEnvelope,
	isStrudelInitMessage,
	isStrudelParentMessage,
	type StrudelParentToRunnerMessage,
	type StrudelRunnerToParentMessage,
	type StrudelWindowToRunnerMessage,
} from '@synth.textmode.art/contracts/runner/strudel';

interface StrudelTransportStateOptions {
	isAllowedOrigin: (origin: string) => boolean;
	isPortAttached: () => boolean;
	attachPort: (port: MessagePort, onMessage: (event: MessageEvent) => void) => void;
	sendReady: () => void;
	handleParentMessage: (message: StrudelParentToRunnerMessage) => void;
}

export class StrudelTransportState {
	private activeParentOrigin: string | null = null;
	private readonly options: StrudelTransportStateOptions;

	constructor(options: StrudelTransportStateOptions) {
		this.options = options;
	}

	getWindowMessageHandler(onPortMessage: (event: MessageEvent<StrudelParentToRunnerMessage>) => void) {
		return (event: MessageEvent<StrudelWindowToRunnerMessage | StrudelParentToRunnerMessage>): void => {
			if (event.source !== window.parent) return;
			if (!this.options.isAllowedOrigin(event.origin)) return;

			const data = event.data;
			if (isStrudelInitMessage(data)) {
				this.activeParentOrigin = event.origin;
				const port = event.ports?.[0];
				if (port) {
					this.options.attachPort(port, onPortMessage as (event: MessageEvent) => void);
				}
				this.options.sendReady();
				return;
			}

			// Window-message fallback path when MessagePort is unavailable.
			if (isStrudelParentMessage(data) && (data.type === 'STR_INIT_AUDIO' || !this.options.isPortAttached())) {
				this.options.handleParentMessage(data);
			}
		};
	}

	postWindowFallbackMessage(message: StrudelRunnerToParentMessage, isDev: boolean): void {
		if (window.parent === window) return;
		const targetOrigin = this.activeParentOrigin ?? (isDev ? '*' : window.location.origin);
		window.parent.postMessage(createStrudelWindowEventEnvelope(message), targetOrigin);
	}
}
