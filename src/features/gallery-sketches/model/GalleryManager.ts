import type { AppStoreAdapter } from '@/platform/state/adapters/appStoreAdapter';
import type { GallerySketch } from '../types';
import { getGallerySketchBySlug, getRandomGallerySketch, toGallerySketchSummary } from './catalog';
import { getGallerySlugFromPathname, normalizeSlug } from './slug';

export interface GalleryManagerDependencies {
	store: AppStoreAdapter;
	applyGallerySketch: (sketch: GallerySketch) => void;
	replaceUrl: (url: string) => void;
	getSketchBySlug?: (slug: string) => GallerySketch | null;
	getRandomSketch?: (excludeSlug?: string) => GallerySketch | null;
}

export class GalleryManager {
	private readonly deps: GalleryManagerDependencies;
	private pendingGallerySketch: GallerySketch | null = null;

	constructor(deps: GalleryManagerDependencies) {
		this.deps = deps;
	}

	hydrateFromLocation(location: Location): void {
		this.resetHydratedState();

		const detectedSlug = getGallerySlugFromPathname(location.pathname);
		if (!detectedSlug) return;

		const sketch = (this.deps.getSketchBySlug ?? getGallerySketchBySlug)(normalizeSlug(detectedSlug));
		if (!sketch) {
			this.deps.replaceUrl('/');
			return;
		}

		this.pendingGallerySketch = sketch;
		this.deps.store.gallery.setActiveSketch(sketch);
		this.deps.store.gallery.setSketchSummary(toGallerySketchSummary(sketch));
	}

	getInitialCodeOverride(): string | null {
		return (
			this.pendingGallerySketch?.textmodeCode ?? this.deps.store.gallery.getActiveSketch()?.textmodeCode ?? null
		);
	}

	applyPendingGallerySketchIfPresent(): void {
		if (!this.pendingGallerySketch) return;
		const sketch = this.pendingGallerySketch;
		this.pendingGallerySketch = null;
		this.applyGallerySketch(sketch);
	}

	loadRandom(): boolean {
		if (this.deps.store.engine.getRandomizeLoading()) return false;

		this.deps.store.engine.setRandomizeLoading(true);
		try {
			const currentSlug = this.deps.store.gallery.getActiveSketch()?.slug;
			const sketch = (this.deps.getRandomSketch ?? getRandomGallerySketch)(currentSlug);
			if (!sketch) return false;

			this.applyGallerySketch(sketch);
			this.deps.replaceUrl(`/s/${sketch.slug}`);
			return true;
		} finally {
			this.deps.store.engine.setRandomizeLoading(false);
		}
	}

	clear(): void {
		this.pendingGallerySketch = null;
		this.deps.store.gallery.clearOriginalSketch();
	}

	private applyGallerySketch(sketch: GallerySketch): void {
		this.deps.store.share.setPayload(null);
		this.deps.store.gallery.setActiveSketch(sketch);
		this.deps.store.gallery.setSketchSummary(toGallerySketchSummary(sketch));
		this.deps.store.engine.setError(null);
		this.deps.applyGallerySketch(sketch);
	}

	private resetHydratedState(): void {
		this.pendingGallerySketch = null;
		this.deps.store.gallery.clearOriginalSketch();
	}
}
