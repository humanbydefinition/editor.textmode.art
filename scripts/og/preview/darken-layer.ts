const DARKEN_LAYER_ID = 'og-darken';

export function mountDarkenLayer(darken: number): void {
	const opacity = Number.isFinite(darken) ? Math.min(1, Math.max(0, darken / 100)) : 0;
	const element = document.getElementById(DARKEN_LAYER_ID) ?? document.createElement('div');
	element.id = DARKEN_LAYER_ID;
	element.style.background = `rgba(0, 0, 0, ${opacity})`;
	if (!element.parentElement) document.body.appendChild(element);
}
