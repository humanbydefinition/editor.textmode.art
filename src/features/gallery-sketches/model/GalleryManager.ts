import type { CodeError } from '@/types';
import type { SharePayload } from '@/features/share/model/sharePayload';
import type { GallerySketch } from '../types';
import { getGallerySketchBySlug, getRandomGallerySketch } from './catalog';
import { getGallerySlugFromPathname, normalizeSlug } from './slug';

export interface GalleryManagerDependencies {
	getGallerySketch: () => GallerySketch | null;
	getOriginalGallerySketch: () => GallerySketch | null;
	setGallerySketch: (sketch: GallerySketch | null) => void;
	clearGallerySketches: () => void;
	setSharePayload: (payload: SharePayload | null) => void;
	setError: (error: CodeError | null) => void;
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
		this.clear();

		const detectedSlug = getGallerySlugFromPathname(location.pathname);
		if (!detectedSlug) return;

		const sketch = (this.deps.getSketchBySlug ?? getGallerySketchBySlug)(normalizeSlug(detectedSlug));
		if (!sketch) {
			this.deps.replaceUrl('/');
			return;
		}

		this.pendingGallerySketch = sketch;
		this.deps.setGallerySketch(sketch);
		const canonicalPath = `/s/${sketch.slug}/`;
		if (location.pathname !== canonicalPath) this.deps.replaceUrl(canonicalPath);
	}

	getInitialCodeOverride(): string | null {
		return (
			this.pendingGallerySketch?.textmodeCode ?? this.deps.getGallerySketch()?.textmodeCode ?? null
		);
	}

	applyPendingGallerySketchIfPresent(): void {
		if (!this.pendingGallerySketch) return;
		const sketch = this.pendingGallerySketch;
		this.pendingGallerySketch = null;
		this.applyGallerySketch(sketch);
	}

	loadRandom(): boolean {
		const currentSlug = this.deps.getGallerySketch()?.slug;
		const sketch = (this.deps.getRandomSketch ?? getRandomGallerySketch)(currentSlug);
		if (!sketch) return false;

		this.applyGallerySketch(sketch);
		this.deps.replaceUrl(`/s/${sketch.slug}/`);
		return true;
	}

	syncActiveSketchWithCode(code: string): void {
		const activeSketch = this.deps.getGallerySketch();
		if (activeSketch) {
			if (code !== activeSketch.textmodeCode) {
				this.deps.setGallerySketch(null);
			}
			return;
		}

		const originalSketch = this.deps.getOriginalGallerySketch();
		if (originalSketch?.textmodeCode === code) {
			this.deps.setGallerySketch(originalSketch);
		}
	}

	clear(): void {
		this.pendingGallerySketch = null;
		this.deps.clearGallerySketches();
	}

	private applyGallerySketch(sketch: GallerySketch): void {
		this.deps.setSharePayload(null);
		this.deps.setGallerySketch(sketch);
		this.deps.setError(null);
		this.deps.applyGallerySketch(sketch);
	}
}
