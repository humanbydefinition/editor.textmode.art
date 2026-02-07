import type { EngineId } from '@/types/engine.types';
import type { SharePayload } from '@/types/share.types';

interface ShareState {
	payload: SharePayload | null;
	consented: boolean;
	promptOpen: boolean;
}

export interface ShareSessionDependencies {
	getShareState: () => ShareState;
	setSharePayload: (payload: SharePayload | null) => void;
	setShareConsented: (consented: boolean) => void;
	setSharePromptOpen: (open: boolean) => void;
	setEditorsReadOnly: (readOnly: boolean) => void;
	applyPayload: (payload: SharePayload) => void;
	focusEditor: (engineId: EngineId) => void;
	restoreLocalSketches: () => void;
	runRestoredSketches: () => void;
	runSharedSketch: (payload: SharePayload) => void;
}

/**
 * Owns all share lock/session behavior including interaction guards.
 * Keeps share-specific workflow logic outside the app composition root.
 */
export class ShareSessionManager {
	private readonly deps: ShareSessionDependencies;
	private guardsAttached = false;

	constructor(deps: ShareSessionDependencies) {
		this.deps = deps;
	}

	applyInitialShareIfPresent(): void {
		const share = this.deps.getShareState();
		if (!share.payload || share.consented) return;

		this.deps.applyPayload(share.payload);
		this.deps.setEditorsReadOnly(true);
	}

	unlockAndRun(): void {
		const payload = this.unlockInternal();
		if (!payload) return;
		this.deps.runSharedSketch(payload);
	}

	unlockOnly(): void {
		const share = this.deps.getShareState();
		if (!share.payload) return;
		this.deps.setSharePromptOpen(false);
		this.deps.setEditorsReadOnly(true);
		this.deps.applyPayload(share.payload);
	}

	discard(): void {
		const share = this.deps.getShareState();
		if (!share.payload) return;

		this.deps.setSharePayload(null);
		this.deps.setEditorsReadOnly(false);
		this.deps.restoreLocalSketches();
		this.deps.runRestoredSketches();
	}

	openPrompt(): void {
		const share = this.deps.getShareState();
		if (!share.payload || share.consented) return;
		this.deps.setSharePromptOpen(true);
	}

	clearShareLockIfPresent(): void {
		const share = this.deps.getShareState();
		if (!share.payload) return;
		this.deps.setSharePayload(null);
		this.deps.setEditorsReadOnly(false);
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
		const share = this.deps.getShareState();
		if (!share.payload) return null;

		this.deps.setShareConsented(true);
		this.deps.setEditorsReadOnly(false);
		this.deps.applyPayload(share.payload);
		this.focusPrimarySharedEditor(share.payload);
		return share.payload;
	}

	private focusPrimarySharedEditor(payload: SharePayload): void {
		if (payload.engines.textmode !== undefined) {
			this.deps.focusEditor('textmode');
			return;
		}
		if (payload.engines.strudel !== undefined) {
			this.deps.focusEditor('strudel');
		}
	}

	private shouldPromptForInteraction(target: HTMLElement | null): boolean {
		if (!target) return false;

		const share = this.deps.getShareState();
		if (!share.payload || share.consented || share.promptOpen) return false;
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
}
