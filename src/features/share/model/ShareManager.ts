import type { SharePayload } from '../types';
import { ShareService } from './ShareService';

export interface ShareManagerDependencies {
	getShare: () => { payload: SharePayload | null; consented: boolean; promptOpen: boolean };
	setSharePayload: (payload: SharePayload | null) => void;
	setShareConsented: (consented: boolean) => void;
	setSharePromptOpen: (open: boolean) => void;
	setEditorReadOnly: (readOnly: boolean) => void;
	applyPayload: (payload: SharePayload) => void;
	focusEditor: () => void;
	restoreMainSketch: () => void;
	runCode: () => void;
	replaceUrl: (url: string) => void;
}

/**
 * Owns client-only share hydration and untrusted-code consent flow.
 */
export class ShareManager {
	private readonly deps: ShareManagerDependencies;
	private guardsAttached = false;

	constructor(deps: ShareManagerDependencies) {
		this.deps = deps;
	}

	hydrateFromLocation(location: Location): void {
		this.resetHydratedState();

		const payload = ShareService.getFromLocation(location);
		if (payload) {
			this.deps.setSharePayload(payload);
		}
	}

	setInitialReadOnlyIfNeeded(): void {
		const { payload, consented } = this.deps.getShare();
		if (!payload || consented) return;

		this.deps.setEditorReadOnly(true);
	}

	unlockAndRun(): void {
		const payload = this.unlockInternal();
		if (!payload) return;
		this.deps.runCode();
	}

	unlockOnly(): void {
		const payload = this.deps.getShare().payload;
		if (!payload) return;
		this.deps.setSharePromptOpen(false);
		this.deps.setEditorReadOnly(true);
		this.deps.applyPayload(payload);
	}

	keepLocked(): void {
		this.deps.setSharePromptOpen(false);
	}

	discard(): void {
		const payload = this.deps.getShare().payload;
		if (!payload) return;

		this.deps.setSharePayload(null);
		this.deps.replaceUrl('/');
		this.deps.setEditorReadOnly(false);
		this.deps.restoreMainSketch();
	}

	openPrompt(): void {
		const { payload, consented } = this.deps.getShare();
		if (!payload || consented) return;
		this.deps.setSharePromptOpen(true);
	}

	lockExecutionIfNeeded(): boolean {
		const { payload, consented, promptOpen } = this.deps.getShare();
		if (!payload || consented) return false;
		if (!promptOpen) {
			this.deps.setSharePromptOpen(true);
		}
		return true;
	}

	attachInteractionGuards(): void {
		if (this.guardsAttached) return;
		document.addEventListener('mousedown', this.handleShareInteraction, true);
		document.addEventListener('keydown', this.handleShareKeydown, true);
		this.guardsAttached = true;
	}

	dispose(): void {
		if (!this.guardsAttached) return;
		document.removeEventListener('mousedown', this.handleShareInteraction, true);
		document.removeEventListener('keydown', this.handleShareKeydown, true);
		this.guardsAttached = false;
	}

	private unlockInternal(): SharePayload | null {
		const payload = this.deps.getShare().payload;
		if (!payload) return null;

		this.deps.setShareConsented(true);
		this.deps.setEditorReadOnly(false);
		this.deps.applyPayload(payload);
		this.deps.focusEditor();
		return payload;
	}

	private shouldPromptForInteraction(target: HTMLElement | null): boolean {
		if (!target) return false;

		const { payload, consented, promptOpen } = this.deps.getShare();
		if (!payload || consented || promptOpen) return false;
		return Boolean(target.closest('.monaco-editor'));
	}

	private handleShareInteraction = (event: MouseEvent): void => {
		const target = event.target as HTMLElement | null;
		if (this.shouldPromptForInteraction(target)) {
			this.deps.setSharePromptOpen(true);
		}
	};

	private handleShareKeydown = (event: KeyboardEvent): void => {
		const target = event.target as HTMLElement | null;
		if (this.shouldPromptForInteraction(target)) {
			this.deps.setSharePromptOpen(true);
		}
	};

	private resetHydratedState(): void {
		this.deps.setSharePayload(null);
		this.deps.setEditorReadOnly(false);
	}
}
