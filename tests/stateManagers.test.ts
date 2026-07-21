import { describe, expect, it, vi } from 'vitest';
import { GalleryManager, type GalleryManagerDependencies, type GallerySketch } from '../src/features/gallery-sketches';
import { ShareManager, type ShareManagerDependencies, type SharePayload } from '../src/features/share';

const sketch: GallerySketch = {
	status: 'APPROVED',
	slug: 'example',
	title: 'Example',
	description: null,
	authorName: null,
	license: null,
	socialLinks: null,
	createdAt: '2026-07-21T00:00:00.000Z',
	textmodeCode: 't.draw(() => {});',
};

describe('state-owning managers', () => {
	it('clears a customized gallery sketch and restores it when its original code returns', () => {
		let activeSketch: GallerySketch | null = sketch;
		let originalSketch: GallerySketch | null = sketch;
		const setGallerySketch = vi.fn((nextSketch: GallerySketch | null) => {
			activeSketch = nextSketch;
			if (nextSketch) originalSketch = nextSketch;
		});
		const manager = new GalleryManager({
			getGallerySketch: () => activeSketch,
			getOriginalGallerySketch: () => originalSketch,
			setGallerySketch,
			clearGallerySketches: vi.fn(),
			setSharePayload: vi.fn(),
			setError: vi.fn(),
			applyGallerySketch: vi.fn(),
			replaceUrl: vi.fn(),
		} satisfies GalleryManagerDependencies);

		manager.syncActiveSketchWithCode('custom code');
		expect(activeSketch).toBeNull();

		manager.syncActiveSketchWithCode(sketch.textmodeCode);
		expect(activeSketch).toBe(sketch);
	});

	it('keeps untrusted shared code locked and opens the consent prompt once', () => {
		const payload: SharePayload = {
			v: 1,
			createdAt: 0,
			engines: { textmode: 't.draw(() => {});' },
		};
		let share = { payload, consented: false, promptOpen: false };
		const setSharePromptOpen = vi.fn((promptOpen: boolean) => {
			share = { ...share, promptOpen };
		});
		const manager = new ShareManager({
			getShare: () => share,
			setSharePayload: vi.fn(),
			setShareConsented: vi.fn(),
			setSharePromptOpen,
			setEditorReadOnly: vi.fn(),
			applyPayload: vi.fn(),
			focusEditor: vi.fn(),
			restoreLocalSketches: vi.fn(),
			runCode: vi.fn(),
			replaceUrl: vi.fn(),
		} satisfies ShareManagerDependencies);

		expect(manager.lockExecutionIfNeeded()).toBe(true);
		expect(manager.lockExecutionIfNeeded()).toBe(true);
		expect(setSharePromptOpen).toHaveBeenCalledTimes(1);

		share = { ...share, consented: true };
		expect(manager.lockExecutionIfNeeded()).toBe(false);
	});
});
