interface UnlockPromptElements {
	root: HTMLDivElement;
	button: HTMLButtonElement;
	status: HTMLParagraphElement;
}

interface StrudelUnlockPromptManagerOptions {
	onUnlockClick: () => Promise<void>;
}

export class StrudelUnlockPromptManager {
	private unlockPrompt: UnlockPromptElements | null = null;
	private unlockPromptVisible = false;
	private readonly options: StrudelUnlockPromptManagerOptions;

	constructor(options: StrudelUnlockPromptManagerOptions) {
		this.options = options;
	}

	setup(): void {
		document.documentElement.style.height = '100%';
		document.documentElement.style.background = 'transparent';
		document.body.style.height = '100%';
		document.body.style.margin = '0';
		document.body.style.background = 'transparent';

		const style = document.createElement('style');
		style.textContent = `
			.strudel-unlock-root {
				position: fixed;
				inset: 0;
				display: none;
				pointer-events: none;
				color: #f4f4f5;
				font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
				box-sizing: border-box;
			}
			.strudel-unlock-card {
				width: 100%;
				height: 100%;
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-radius: 10px;
				background: linear-gradient(180deg, rgba(24, 24, 27, 0.97) 0%, rgba(9, 9, 11, 0.98) 100%);
				box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
				padding: 10px 10px 0px;
				display: grid;
				grid-template-rows: auto auto auto auto;
				pointer-events: auto;
				box-sizing: border-box;
				overflow: hidden;
			}
			.strudel-unlock-title {
				margin: 0;
				font-size: 12px;
				font-weight: 600;
				line-height: 1.3;
				letter-spacing: 0.01em;
				color: rgba(255, 255, 255, 0.96);
			}
			.strudel-unlock-description {
				margin: 0;
				font-size: 11px;
				line-height: 1.45;
				color: rgba(212, 212, 216, 0.9);
				max-width: 36ch;
			}
			.strudel-unlock-button {
				height: 30px;
				border: 1px solid rgba(255, 255, 255, 0.14);
				border-radius: 8px;
				padding: 0 10px;
				font-size: 11px;
				font-weight: 600;
				cursor: pointer;
				background: rgba(39, 39, 42, 0.88);
				color: rgba(250, 250, 250, 0.95);
				text-transform: lowercase;
				transition: background-color 120ms ease, border-color 120ms ease, transform 120ms ease;
			}
			.strudel-unlock-button:hover {
				background: rgba(63, 63, 70, 0.95);
				border-color: rgba(255, 255, 255, 0.22);
			}
			.strudel-unlock-button:active {
				transform: translateY(1px);
			}
			.strudel-unlock-button:focus-visible {
				outline: 2px solid rgba(161, 161, 170, 0.35);
				outline-offset: 1px;
			}
			.strudel-unlock-button:disabled {
				cursor: default;
				opacity: 0.72;
			}
			.strudel-unlock-status {
				margin: 0;
				font-size: 10px;
				min-height: 13px;
				line-height: 1.3;
				color: #fda4af;
				display: none;
			}
		`;
		document.head.appendChild(style);

		const root = document.createElement('div');
		root.className = 'strudel-unlock-root';

		const card = document.createElement('div');
		card.className = 'strudel-unlock-card';

		const title = document.createElement('h1');
		title.textContent = 'enable strudel audio';
		title.className = 'strudel-unlock-title';

		const description = document.createElement('p');
		description.textContent = 'tap once to unlock audio playback.';
		description.className = 'strudel-unlock-description';

		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = 'enable audio';
		button.className = 'strudel-unlock-button';
		button.addEventListener('click', this.handleUnlockButtonClick);

		const status = document.createElement('p');
		status.className = 'strudel-unlock-status';

		card.appendChild(title);
		card.appendChild(description);
		card.appendChild(button);
		card.appendChild(status);
		root.appendChild(card);
		document.body.appendChild(root);

		this.unlockPrompt = { root, button, status };
		this.show();
	}

	show(): void {
		if (!this.unlockPrompt) return;
		this.unlockPromptVisible = true;
		this.unlockPrompt.root.style.display = 'block';
		this.unlockPrompt.button.disabled = false;
		this.unlockPrompt.button.textContent = 'enable audio';
		this.setStatus('');
	}

	hide(): void {
		if (!this.unlockPrompt) return;
		this.unlockPromptVisible = false;
		this.unlockPrompt.root.style.display = 'none';
		this.setStatus('');
	}

	setStatus(message: string): void {
		if (!this.unlockPrompt) return;
		this.unlockPrompt.status.textContent = message;
		this.unlockPrompt.status.style.display = message.length > 0 ? 'block' : 'none';
	}

	isVisible(): boolean {
		return this.unlockPromptVisible;
	}

	setButtonPending(): void {
		if (!this.unlockPrompt) return;
		this.unlockPrompt.button.disabled = true;
		this.unlockPrompt.button.textContent = 'enabling...';
		this.setStatus('');
	}

	setButtonRetry(): void {
		if (!this.unlockPrompt) return;
		this.unlockPrompt.button.disabled = false;
		this.unlockPrompt.button.textContent = 'enable audio';
	}

	dispose(): void {
		if (!this.unlockPrompt) return;
		this.unlockPrompt.button.removeEventListener('click', this.handleUnlockButtonClick);
		this.unlockPrompt.root.remove();
		this.unlockPrompt = null;
		this.unlockPromptVisible = false;
	}

	private handleUnlockButtonClick = async (): Promise<void> => {
		if (!this.unlockPrompt || !this.unlockPromptVisible) return;
		this.setButtonPending();
		await this.options.onUnlockClick();
	};
}
