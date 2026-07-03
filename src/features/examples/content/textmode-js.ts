import type { ExampleCategory } from '@/features/examples/types';

export const textmodeExampleCategories: ExampleCategory[] = [
	{
		id: 'drawing',
		displayName: 'Drawing primitives',
		examples: [
			{
				id: 'textmode-primitives-signal-grid',
				name: 'signal grid',
				description: 'Draws animated points, lines, and rectangles directly with the core textmode.js API.',
				category: 'drawing',
				code: `t.fontSize(14);

t.draw(() => {
  t.background(5, 8, 18);
  t.charColor(70, 230, 180);
  t.cellColor(0, 0, 0, 0);
  t.char("+");

  for (let x = -30; x <= 30; x += 4) t.line(x, -14, x, 14);
  for (let y = -14; y <= 14; y += 2) t.line(-30, y, 30, y);

  t.char("#");
  t.charColor(255, 220, 110);
  for (let i = 0; i < 28; i++) {
    const x = i - 14;
    const y = Math.sin(t.secs * 2 + i * 0.45) * 6;
    t.push();
    t.translate(x, y);
    t.point();
    t.pop();
  }

  t.char("*");
  t.charColor(255, 95, 135);
  t.rect(8 + Math.sin(t.secs) * 3, 4 + Math.cos(t.secs * 1.3) * 2);
});`,
			},
			{
				id: 'textmode-print-status-panel',
				name: 'status panel',
				description: 'Uses text alignment, print, and per-cell colors to build a compact editor-style panel.',
				category: 'drawing',
				code: `t.fontSize(16);

const rows = [
  "editor.textmode.art",
  "mode: live",
  "api: textmode.js",
  "frames: "
];

t.draw(() => {
  t.background(8, 10, 18);
  t.printAlign("left", "top");
  t.cellColor(12, 18, 30);
  t.charColor(95, 255, 200);
  t.char(" ");
  t.rect(30, 9);

  for (let i = 0; i < rows.length; i++) {
    const text = i === 3 ? rows[i] + t.frameCount : rows[i];
    t.charColor(i === 0 ? "#ffffff" : "#9be8ff");
    t.cellColor(i === 0 ? "#223047" : "#111827");
    t.print(text.padEnd(24, " "), -11, -3 + i);
  }

  t.charColor(255, 215, 90);
  t.cellColor(0, 0, 0, 0);
  t.print("core drawing, no synth layer", -11, 3);
});`,
			},
		],
	},
	{
		id: 'layers',
		displayName: 'Layers and transforms',
		examples: [
			{
				id: 'textmode-layer-blend-badges',
				name: 'blend badges',
				description: 'Composites two drawing layers with blend modes, opacity, offsets, and independent font sizes.',
				category: 'layers',
				code: `t.fontSize(18);

const glow = t.layers.add({ fontSize: 28, blendMode: t.BLEND_SCREEN, opacity: 0.72 });
const marks = t.layers.add({ fontSize: 12, blendMode: t.BLEND_ADDITIVE, opacity: 0.9 });

t.draw(() => {
  t.background(4, 6, 15);
  t.char(".");
  t.charColor(50, 70, 105);
  t.cellColor(0, 0, 0, 0);
  for (let x = -28; x <= 28; x += 3) {
    for (let y = -12; y <= 12; y += 3) {
      t.push();
      t.translate(x, y);
      t.point();
      t.pop();
    }
  }
});

glow.draw(() => {
  t.clear();
  t.char("@");
  t.charColor(60, 220, 255);
  t.cellColor(12, 18, 42, 20);
  t.rect(8, 5);
  glow.offset(Math.sin(t.secs) * 24, Math.cos(t.secs * 0.7) * 14);
});

marks.draw(() => {
  t.clear();
  t.char("#");
  t.charColor(255, 150, 95);
  t.cellColor(0, 0, 0, 0);
  marks.rotateZ(t.secs * 18);
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2 + t.secs;
    t.push();
    t.translate(Math.cos(angle) * 18, Math.sin(angle) * 8);
    t.point();
    t.pop();
  }
});`,
			},
			{
				id: 'textmode-transform-orbit',
				name: 'transform orbit',
				description: 'Demonstrates push/pop transforms for repeated animated glyph geometry.',
				category: 'layers',
				code: `t.fontSize(20);

t.draw(() => {
  t.background(6, 7, 14);
  t.charColor(220, 230, 255);
  t.cellColor(0, 0, 0, 0);

  for (let i = 0; i < 18; i++) {
    const angle = i / 18 * Math.PI * 2 + t.secs * 0.8;
    const radius = 7 + Math.sin(t.secs * 1.6 + i) * 2;
    t.push();
    t.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
    t.rotate(angle);
    t.char(i % 2 === 0 ? "/" : "\\\\");
    t.charColor(90 + i * 8, 190, 255 - i * 5);
    t.rect(3, 1);
    t.pop();
  }

  t.char("o");
  t.charColor(255, 230, 110);
  t.point();
});`,
			},
		],
	},
];
