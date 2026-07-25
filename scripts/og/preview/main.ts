import type { OgPreviewRequest, OgPreviewResult } from '../contracts';
import { mountGalleryOverlay } from './gallery-overlay';
import { mountSiteOverlay } from './site-overlay';
import { renderSketchAtFrame, type RenderedSketch } from './sketch-runtime';

declare global {
	interface Window {
		renderOg(request: OgPreviewRequest): Promise<OgPreviewResult>;
	}
}

window.renderOg = async (request) => {
	document.body.dataset.status = 'running';
	delete document.body.dataset.error;
	document.querySelectorAll('canvas, #og-overlay').forEach((element) => element.remove());

	let renderedSketch: RenderedSketch | undefined;
	const markError = (error: unknown): void => {
		const normalized = error instanceof Error ? error : new Error(String(error));
		document.body.dataset.status = 'error';
		document.body.dataset.error = normalized.message;
	};

	try {
		renderedSketch = await renderSketchAtFrame(request.code, request.frame, markError);
		const overlay = request.card.kind === 'gallery' ? mountGalleryOverlay(request.card) : mountSiteOverlay();

		await document.fonts.ready;
		const descriptionLines = overlay.fit();
		await nextPaint();
		overlay.assert();

		document.body.dataset.status = 'ready';
		window.addEventListener('pagehide', renderedSketch.dispose, { once: true });
		return {
			frame: renderedSketch.frame,
			seconds: renderedSketch.seconds,
			descriptionLines,
			kind: request.card.kind,
		};
	} catch (error) {
		markError(error);
		renderedSketch?.dispose();
		throw error;
	}
};

function nextPaint(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
