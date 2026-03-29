import type { ApprovedSketch, PublicSketchAccess } from '@synth.textmode.art/contracts/sketch';
import { fetchRandomApprovedSketch, fetchSketchBySlugAccess } from '@/platform/api/SketchApiService';
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
	applyApprovedSketch: (sketch: ApprovedSketch) => void;
	replaceUrl: (url: string) => void;
}

/**
 * Owns share hydration, consent/lock flow, and approved-sketch workflows.
 * Keeps share-specific orchestration out of AppRuntime.
 */
export class ShareManager {
	private readonly deps: ShareManagerDependencies;
	private pendingApprovedSketch: ApprovedSketch | null = null;
	private guardsAttached = false;

	constructor(deps: ShareManagerDependencies) {
		this.deps = deps;
	}

	async hydrateFromLocation(location: Location): Promise<void> {
		this.resetHydratedState();

		const store = this.deps.store;
		const payload = ShareService.getFromLocation(location);
		if (payload) {
			store.share.setSketchSummary(null);
			store.share.setPayload(payload);
			return;
		}

		const detectedSlug = this.getDetectedSlug(location);
		if (!detectedSlug) {
			store.share.setSketchSummary(null);
			return;
		}

		const sketchData = await fetchSketchBySlugAccess(detectedSlug);
		if (!sketchData) {
			store.share.setSketchSummary(null);
			this.deps.replaceUrl('/');
			return;
		}

		store.share.setSketchSummary(this.toSketchSummary(sketchData));

		if (sketchData.status === 'APPROVED') {
			this.pendingApprovedSketch = this.toApprovedSketch(sketchData);
			return;
		}

		store.share.setApprovedSketch(null);
		store.share.setPayload(this.toSharePayload(sketchData));
	}

	getInitialCodeOverride(): string | null {
		const payload = this.deps.store.share.getPayload();
		if (payload?.engines.textmode) {
			return payload.engines.textmode;
		}

		if (this.pendingApprovedSketch) {
			return this.pendingApprovedSketch.textmodeCode;
		}

		const approvedSketch = this.deps.store.share.getApprovedSketch();
		return approvedSketch?.textmodeCode ?? null;
	}

	applyInitialShareIfPresent(): void {
		const payload = this.deps.store.share.getPayload();
		if (!payload || this.deps.store.share.getConsented()) return;

		this.deps.applyPayload(payload);
		this.deps.setEditorReadOnly(true);
	}

	applyPendingApprovedSketchIfPresent(): void {
		if (!this.pendingApprovedSketch) return;
		const sketch = this.pendingApprovedSketch;
		this.pendingApprovedSketch = null;
		this.applyApprovedSketch(sketch);
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

	async randomize(): Promise<boolean> {
		if (this.deps.store.engine.getRandomizeLoading()) return false;

		this.deps.store.engine.setRandomizeLoading(true);

		try {
			const currentSlug = this.deps.store.share.getApprovedSketch()?.slug;
			const sketch = await fetchRandomApprovedSketch(currentSlug);
			if (!sketch) return false;
			this.applyApprovedSketch(sketch);
			return true;
		} catch {
			return false;
		} finally {
			this.deps.store.engine.setRandomizeLoading(false);
		}
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

	private clearShareLockIfPresent(): void {
		const payload = this.deps.store.share.getPayload();
		if (!payload) return;
		this.deps.store.share.setPayload(null);
		this.deps.setEditorReadOnly(false);
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

	private getDetectedSlug(location: Location): string | undefined {
		return location.pathname.match(/^\/s\/([a-z0-9-]+)$/i)?.[1];
	}

	private resetHydratedState(): void {
		this.pendingApprovedSketch = null;
		this.deps.store.share.setPayload(null);
		this.deps.store.share.clearOriginalApprovedSketch();
		this.deps.setEditorReadOnly(false);
	}

	private applyApprovedSketch(sketch: ApprovedSketch): void {
		const store = this.deps.store;
		this.clearShareLockIfPresent();

		store.share.setApprovedSketch(sketch);
		store.share.setSketchSummary({
			status: 'APPROVED',
			slug: sketch.slug,
			title: sketch.title,
			description: sketch.description,
			authorName: sketch.authorName,
			license: sketch.license,
			socialLinks: sketch.socialLinks,
		});
		store.engine.setError(null);
		this.deps.applyApprovedSketch(sketch);
	}

	private toApprovedSketch(sketch: Extract<PublicSketchAccess, { status: 'APPROVED' }>): ApprovedSketch {
		return {
			id: sketch.id,
			slug: sketch.slug,
			title: sketch.title,
			description: sketch.description,
			authorName: sketch.authorName,
			license: sketch.license,
			socialLinks: sketch.socialLinks,
			textmodeCode: sketch.textmodeCode,
			ogImageUrl: sketch.ogImageUrl,
			createdAt: sketch.createdAt,
		};
	}

	private toSharePayload(sketch: Extract<PublicSketchAccess, { status: 'PENDING' }>): SharePayload {
		return {
			v: 1,
			createdAt: Date.now(),
			engines: {
				textmode: sketch.textmodeCode,
			},
		};
	}

	private toSketchSummary(sketch: PublicSketchAccess) {
		if (sketch.status === 'APPROVED') {
			return {
				status: 'APPROVED' as const,
				slug: sketch.slug,
				title: sketch.title,
				description: sketch.description,
				authorName: sketch.authorName,
				license: sketch.license,
				socialLinks: sketch.socialLinks,
			};
		}

		return {
			status: 'PENDING' as const,
			slug: sketch.slug,
			title: sketch.title,
			description: sketch.description,
			authorName: sketch.authorName,
			license: sketch.license,
			socialLinks: null,
		};
	}
}
