export interface SafariActivationControllerOptions {
	onActivateRuntime: () => void;
	onStateChange: () => void;
}

/**
 * Owns Safari-specific user-gesture activation flow for the runner canvas.
 */
export class SafariActivationController {
	private readonly options: SafariActivationControllerOptions;
	private showPrompt = false;
	private activationPending = false;
	private cancelHandler: ((event: KeyboardEvent) => void) | null = null;
	private overlay: HTMLElement | null = null;
	private appContainerDisplayBeforeActivation: string | null = null;

	constructor(options: SafariActivationControllerOptions) {
		this.options = options;
	}

	static shouldOfferPrompt(userAgent: string = navigator.userAgent): boolean {
		const isWebKit = /AppleWebKit/i.test(userAgent) && !/Chrome|CriOS|Chromium|Edg|OPR/i.test(userAgent);
		const isMacOS = /Macintosh/i.test(userAgent);
		return isWebKit && isMacOS;
	}

	get isPromptVisible(): boolean {
		return this.showPrompt;
	}

	setPromptVisible(visible: boolean): void {
		if (this.showPrompt === visible) return;
		this.showPrompt = visible;
		this.options.onStateChange();
	}

	beginActivation(): void {
		if (this.activationPending) return;

		this.activationPending = true;
		this.mountOverlay();
		this.hideAppContainer();
		this.options.onStateChange();

		this.cancelHandler = (event: KeyboardEvent): void => {
			if (event.key !== 'Escape') return;
			this.endActivation({ activated: false });
		};
		window.addEventListener('keydown', this.cancelHandler, true);
	}

	handleRunnerInteraction(): void {
		if (!this.activationPending) return;
		this.options.onActivateRuntime();
		this.endActivation({ activated: true });
	}

	dispose(): void {
		if (this.cancelHandler) {
			window.removeEventListener('keydown', this.cancelHandler, true);
			this.cancelHandler = null;
		}
		this.unmountOverlay();
		this.restoreAppContainer();
		this.activationPending = false;
	}

	private endActivation(options: { activated: boolean }): void {
		if (this.cancelHandler) {
			window.removeEventListener('keydown', this.cancelHandler, true);
			this.cancelHandler = null;
		}

		this.unmountOverlay();
		this.restoreAppContainer();
		this.activationPending = false;
		if (options.activated) {
			this.showPrompt = false;
		}
		this.options.onStateChange();
	}

	private mountOverlay(): void {
		if (this.overlay) return;

		const overlay = document.createElement('div');
		overlay.id = 'safari-activation-overlay';
		overlay.innerHTML = [
			'<div class="safari-activation-overlay-card">',
			'<div class="safari-activation-overlay-kicker">safari canvas setup</div>',
			'<div class="safari-activation-overlay-title">click the background once to unlock smooth rendering</div>',
			'<div class="safari-activation-overlay-body">the ui is temporarily hidden so your click goes directly to the moving canvas.</div>',
			'<div class="safari-activation-overlay-hint">if motion still feels capped, click the background one more time.</div>',
			'<div class="safari-activation-overlay-shortcut">tip: press ctrl+shift+h any time to hide editors and click the canvas manually.</div>',
			'<div class="safari-activation-overlay-meta">press esc to cancel</div>',
			'</div>',
		].join('');

		document.body.appendChild(overlay);
		this.overlay = overlay;
	}

	private unmountOverlay(): void {
		if (!this.overlay) return;
		this.overlay.remove();
		this.overlay = null;
	}

	private hideAppContainer(): void {
		const appContainer = document.getElementById('app-container');
		if (!appContainer) return;
		this.appContainerDisplayBeforeActivation = appContainer.style.display;
		appContainer.style.display = 'none';
	}

	private restoreAppContainer(): void {
		const appContainer = document.getElementById('app-container');
		if (!appContainer) return;
		appContainer.style.display = this.appContainerDisplayBeforeActivation ?? '';
		this.appContainerDisplayBeforeActivation = null;
	}
}
