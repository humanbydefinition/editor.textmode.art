import type { ExampleCategory } from '@/features/examples/types';

export const filtersExampleCategories: ExampleCategory[] = [
	{
		id: 'color-distortion',
		displayName: 'Color and distortion',
		examples: [
			{
				id: 'filters-hue-rotate-radar',
				name: 'hue rotate radar',
				description: 'Draws a generated scene and applies an animated global hue rotation filter.',
				category: 'color-distortion',
				code: `t.fontSize(14);

t.draw(() => {
  t.background(3, 5, 12);
  t.char("*");
  t.cellColor(0, 0, 0, 0);

  for (let i = 0; i < 48; i++) {
    const angle = i / 48 * Math.PI * 2;
    const radius = 3 + (i % 8) * 2;
    t.charColor(80 + i * 3, 220 - i, 180 + i);
    t.push();
    t.translate(Math.cos(angle + t.secs * 0.35) * radius, Math.sin(angle) * radius);
    t.point();
    t.pop();
  }

  t.charColor(255, 255, 255);
  t.char("o");
  t.rect(18, 9);
  t.filter("hueRotate", t.secs * 80);
});`,
			},
			{
				id: 'filters-chromatic-layer',
				name: 'chromatic layer',
				description: 'Applies chromatic aberration and pixelation to a generated layer-safe drawing.',
				category: 'color-distortion',
				code: `t.fontSize(16);

t.draw(() => {
  t.background(5, 6, 14);
  t.charColor(245, 245, 255);
  t.cellColor(0, 0, 0, 0);

  for (let y = -10; y <= 10; y += 2) {
    t.char(y % 4 === 0 ? "=" : "-");
    t.line(-24 + Math.sin(t.secs + y) * 3, y, 24 + Math.cos(t.secs + y) * 3, y);
  }

  t.char("#");
  t.charColor(255, 170, 100);
  t.rect(12 + Math.sin(t.secs) * 4, 5 + Math.cos(t.secs * 1.4) * 2);

  t.filter("pixelate", { pixelSize: 3 + Math.sin(t.secs) * 2 });
  t.filter("chromaticAberration", {
    amount: 6,
    direction: [Math.sin(t.secs), Math.cos(t.secs)]
  });
});`,
			},
		],
	},
	{
		id: 'stylization',
		displayName: 'Stylization',
		examples: [
			{
				id: 'filters-crt-scanlines',
				name: 'crt scanlines',
				description: 'Combines scanlines and vignette on generated textmode geometry without external assets.',
				category: 'stylization',
				code: `t.fontSize(12);

t.draw(() => {
  t.background(8, 10, 18);
  t.printAlign("center", "middle");

  for (let i = 0; i < 9; i++) {
    t.charColor(80 + i * 18, 255 - i * 12, 160 + i * 8);
    t.cellColor(0, 0, 0, 0);
    t.print("TEXTMODE FILTERS", Math.sin(t.secs + i) * 2, i - 4);
  }

  t.filter("scanlines", {
    count: 180,
    lineWidth: 0.45,
    intensity: 0.62,
    speed: 0.6,
    time: t.secs
  });
  t.filter("vignette", { amount: 0.72, softness: 0.65, roundness: 0.8 });
});`,
			},
			{
				id: 'filters-glitch-pulse',
				name: 'glitch pulse',
				description: 'Uses a controlled glitch amount over a deterministic generated scene.',
				category: 'stylization',
				code: `t.fontSize(18);

t.draw(() => {
  t.background(4, 4, 12);
  t.charColor(100, 240, 255);
  t.cellColor(0, 0, 0, 0);

  for (let i = 0; i < 18; i++) {
    const x = -18 + i * 2;
    const y = Math.sin(t.secs * 3 + i * 0.6) * 6;
    t.char(i % 3 === 0 ? "#" : i % 3 === 1 ? "+" : ".");
    t.push();
    t.translate(x, y);
    t.point();
    t.pop();
  }

  t.charColor(255, 230, 120);
  t.printAlign("center", "middle");
  t.print("GLITCH", 0, 0);

  const pulse = Math.max(0, Math.sin(t.secs * 2.2)) * 0.35;
  t.filter("glitch", { amount: pulse });
});`,
			},
		],
	},
];
