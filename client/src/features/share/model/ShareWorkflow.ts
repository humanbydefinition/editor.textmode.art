import type { ApprovedSketch, PublicSketchAccess } from '@synth.textmode.art/contracts/sketch';
import { fetchRandomApprovedSketch, fetchSketchBySlugAccess } from '@/platform/api/SketchApiService';
import { ShareService } from '@/shared/lib/ShareService';
import type { SharePayload } from '../share.types';
import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';

interface ShareWorkflowDependencies {
	store: AppStoreAdapter;
	render: () => void;
	clearShareLockIfPresent: () => void;
	applyApprovedSketch: (sketch: ApprovedSketch) => void;
	applyApprovedSketchToStrudel: (sketch: ApprovedSketch) => void;
	getServerInjectedSlug: () => string | undefined;
	replaceUrl: (url: string) => void;
}

/**
 * Owns share hydration and approved-sketch workflows.
 * Keeps AppRuntime orchestration free of feature-level branching.
 */
export class ShareWorkflow {
	private readonly deps: ShareWorkflowDependencies;
	private pendingApprovedSketch: ApprovedSketch | null = null;
	private randomizeLoading = false;

	constructor(deps: ShareWorkflowDependencies) {
		this.deps = deps;
	}

	getRandomizeLoading(): boolean {
		return this.randomizeLoading;
	}

	async hydrateFromLocation(location: Location): Promise<void> {
		const store = this.deps.store;
		const payload = ShareService.getFromLocation(location);
		if (payload) {
			store.share.setSlugSketchInfo(null);
			store.share.setPayload(payload);
			return;
		}

		const detectedSlug = this.getDetectedSlug(location);
		if (!detectedSlug) {
			store.share.setSlugSketchInfo(null);
			return;
		}

		const sketchData = await fetchSketchBySlugAccess(detectedSlug);
		if (!sketchData) {
			store.share.setSlugSketchInfo(null);
			this.deps.replaceUrl('/');
			return;
		}

		store.share.setSlugSketchInfo(this.toSlugSketchInfo(sketchData));

		if (sketchData.status === 'APPROVED') {
			this.pendingApprovedSketch = this.toApprovedSketch(sketchData);
			return;
		}

		store.share.setApprovedSketch(null);
		store.share.setPayload(this.toSharePayload(sketchData));
	}

	applyPendingApprovedSketchIfPresent(): void {
		if (!this.pendingApprovedSketch) return;
		const sketch = this.pendingApprovedSketch;
		this.pendingApprovedSketch = null;
		this.applyApprovedSketch(sketch);
	}

	syncApprovedSketchToStrudelIfPresent(): void {
		const approvedSketch = this.deps.store.share.getApprovedSketch();
		if (!approvedSketch) return;
		this.deps.applyApprovedSketchToStrudel(approvedSketch);
	}

	async randomize(): Promise<boolean> {
		if (this.randomizeLoading) return false;

		this.randomizeLoading = true;
		this.deps.render();

		try {
			const currentSlug = this.deps.store.share.getApprovedSketch()?.slug;
			const sketch = await fetchRandomApprovedSketch(currentSlug);
			if (!sketch) return false;
			this.applyApprovedSketch(sketch);
			return true;
		} catch {
			return false;
		} finally {
			this.randomizeLoading = false;
			this.deps.render();
		}
	}

	private getDetectedSlug(location: Location): string | undefined {
		const slugFromServer = this.deps.getServerInjectedSlug();
		if (slugFromServer) return slugFromServer;

		return location.pathname.match(/^\/s\/([a-z0-9-]+)$/i)?.[1];
	}

	private applyApprovedSketch(sketch: ApprovedSketch): void {
		const store = this.deps.store;
		this.deps.clearShareLockIfPresent();

		store.share.setApprovedSketch(sketch);
		store.share.setSlugSketchInfo({
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

		if (store.ui.getIsMobile()) {
			store.ui.setActivePanel('textmode');
			this.deps.render();
		}
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
			strudelCode: sketch.strudelCode,
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
				...(sketch.strudelCode ? { strudel: sketch.strudelCode } : {}),
			},
		};
	}

	private toSlugSketchInfo(sketch: PublicSketchAccess) {
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
