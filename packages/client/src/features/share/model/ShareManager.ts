import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { SharePayload } from '../types';
import { ShareService } from './ShareService';

export interface ShareManagerDependencies {
	store: AppStoreAdapter;
	setEditorReadOnly: (readOnly: boolean) => void;
	applyPayload: (payload: SharePayload) => void;
	focusEditor: () => void;
	restoreLocalSketches: () => void;
	runRestoredSketches: () => void;
	runSharedSketch: () => void;
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
			this.deps.store.share.setPayload(payload);
			return;
		}

		if (location.pathname !== '/') {
			this.deps.replaceUrl('/');
		}
	}

	getInitialCodeOverride(): string | null {
		const payload = this.deps.store.share.getPayload();
		return payload?.engines.textmode ?? null;
	}

	applyInitialShareIfPresent(): void {
		const payload = this.deps.store.share.getPayload();
		if (!payload || this.deps.store.share.getConsented()) return;

		this.deps.applyPayload(payload);
		this.deps.setEditorReadOnly(true);
	}

	unlockAndRun(): void {
		const payload = this.unlockInternal();
		if (!payload) return;
		this.deps.runSharedSketch();
	}

	unlockOnly(): void {
		const payload = this.deps.store.share.getPayload();
		if (!payload) return;
		this.deps.store.share.setPromptOpen(false);
		this.deps.setEditorReadOnly(true);
		this.deps.applyPayload(payload);
	}

	discard(): void {
		const payload = this.deps.store.share.getPayload();
		if (!payload) return;

		this.deps.store.share.setPayload(null);
		this.deps.setEditorReadOnly(false);
		this.deps.restoreLocalSketches();
		this.deps.runRestoredSketches();
	}

	openPrompt(): void {
		const payload = this.deps.store.share.getPayload();
		if (!payload || this.deps.store.share.getConsented()) return;
		this.deps.store.share.setPromptOpen(true);
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
		const payload = this.deps.store.share.getPayload();
		if (!payload) return null;

		this.deps.store.share.setConsented(true);
		this.deps.setEditorReadOnly(false);
		this.deps.applyPayload(payload);
		this.deps.focusEditor();
		return payload;
	}

	private shouldPromptForInteraction(target: HTMLElement | null): boolean {
		if (!target) return false;

		const payload = this.deps.store.share.getPayload();
		if (!payload || this.deps.store.share.getConsented() || this.deps.store.share.getPromptOpen()) return false;
		return Boolean(target.closest('.monaco-editor'));
	}

	private handleShareInteraction = (event: MouseEvent): void => {
		const target = event.target as HTMLElement | null;
		if (this.shouldPromptForInteraction(target)) {
			this.deps.store.share.setPromptOpen(true);
		}
	};

	private handleShareKeydown = (event: KeyboardEvent): void => {
		const target = event.target as HTMLElement | null;
		if (this.shouldPromptForInteraction(target)) {
			this.deps.store.share.setPromptOpen(true);
		}
	};

	private resetHydratedState(): void {
		this.deps.store.share.setPayload(null);
		this.deps.setEditorReadOnly(false);
	}
}
