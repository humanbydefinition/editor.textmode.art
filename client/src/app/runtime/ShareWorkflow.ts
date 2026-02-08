import type { ApprovedSketch, PublicSketchAccess } from '@synth.textmode.art/contracts/sketch';
import { fetchRandomApprovedSketch, fetchSketchBySlugAccess } from '@/services/SketchApiService';
import { ShareService } from '@/services/ShareService';
import { useAppStore } from '@/platform/state/appStore';
import type { SharePayload } from '@/types/share.types';

interface ShareWorkflowDependencies {
	render: () => void;
	clearShareLockIfPresent: () => void;
	applyApprovedSketch: (sketch: ApprovedSketch) => void;
	applyApprovedSketchToStrudel: (sketch: ApprovedSketch) => void;
	getServerInjectedSlug: () => string | undefined;
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
		const store = useAppStore.getState();
		const sharedPayload = ShareService.getFromLocation(location);
		if (sharedPayload) {
			store.setSlugSketchInfo(null);
			store.setSharePayload(sharedPayload);
			return;
		}

		const detectedSlug = this.getDetectedSlug(location);
		if (!detectedSlug) {
			store.setSlugSketchInfo(null);
			return;
		}

		const sketchData = await fetchSketchBySlugAccess(detectedSlug);
		if (!sketchData) {
			store.setSlugSketchInfo(null);
			return;
		}

		store.setSlugSketchInfo(this.toSlugSketchInfo(sketchData));

		if (sketchData.status === 'APPROVED') {
			this.pendingApprovedSketch = this.toApprovedSketch(sketchData);
			return;
		}

		store.setApprovedSketch(null);
		store.setSharePayload(this.toSharePayload(sketchData));
	}

	applyPendingApprovedSketchIfPresent(): void {
		if (!this.pendingApprovedSketch) return;
		const sketch = this.pendingApprovedSketch;
		this.pendingApprovedSketch = null;
		this.applyApprovedSketch(sketch);
	}

	syncApprovedSketchToStrudelIfPresent(): void {
		const approvedSketch = useAppStore.getState().approvedSketch;
		if (!approvedSketch) return;
		this.deps.applyApprovedSketchToStrudel(approvedSketch);
	}

	async randomize(): Promise<void> {
		if (this.randomizeLoading) return;

		this.randomizeLoading = true;
		this.deps.render();

		try {
			const currentSlug = useAppStore.getState().approvedSketch?.slug;
			const sketch = await fetchRandomApprovedSketch(currentSlug);
			if (!sketch) return;
			this.applyApprovedSketch(sketch);
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
		const store = useAppStore.getState();
		this.deps.clearShareLockIfPresent();

		store.setApprovedSketch(sketch);
		store.setSlugSketchInfo({
			status: 'APPROVED',
			slug: sketch.slug,
			title: sketch.title,
			description: sketch.description,
			authorName: sketch.authorName,
			license: sketch.license,
			socialLinks: sketch.socialLinks,
		});
		store.setError(null);
		this.deps.applyApprovedSketch(sketch);

		if (store.isMobile) {
			store.setActivePanel('textmode');
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
