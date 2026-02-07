import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import { fetchApprovedSketch, fetchRandomApprovedSketch } from '@/services/SketchApiService';
import { ShareService } from '@/services/ShareService';
import { useAppStore } from '@/platform/state/appStore';

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
		const sharedPayload = ShareService.getFromLocation(location);
		if (sharedPayload) {
			useAppStore.getState().setSharePayload(sharedPayload);
			return;
		}

		const detectedSlug = this.getDetectedSlug(location);
		if (!detectedSlug) return;

		const sketchData = await fetchApprovedSketch(detectedSlug);
		if (sketchData) {
			this.pendingApprovedSketch = sketchData;
		}
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
		store.setError(null);
		this.deps.applyApprovedSketch(sketch);

		if (store.isMobile) {
			store.setActivePanel('textmode');
			this.deps.render();
		}
	}
}
