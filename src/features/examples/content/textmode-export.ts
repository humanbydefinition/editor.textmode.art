import type { ExampleCategory } from '@/features/examples/types';

export const exportExampleCategories: ExampleCategory[] = [
	{
		id: 'safe-export',
		displayName: 'Safe export inspection',
		examples: [
			{
				id: 'export-to-string-preview',
				name: 'toString preview',
				description: 'Generates plain-text output and displays a small preview without downloading anything.',
				category: 'safe-export',
				code: `t.fontSize(14);

let textPreview = "waiting for first text export...";
const overlay = t.layers.add({ fontSize: 12, blendMode: t.BLEND_SCREEN, opacity: 0.95 });

t.draw(() => {
  t.background(4, 7, 16);
  t.charColor(110, 230, 210);
  t.cellColor(0, 0, 0, 0);

  for (let i = 0; i < 32; i++) {
    const x = i - 16;
    const y = Math.sin(t.secs * 2 + i * 0.5) * 7;
    t.char(i % 2 === 0 ? "/" : "\\\\");
    t.push();
    t.translate(x, y);
    t.point();
    t.pop();
  }

  if (t.frameCount % 45 === 1) {
    textPreview = t.toString({ preserveTrailingSpaces: false })
      .split("\\n")
      .slice(0, 3)
      .join(" / ")
      .slice(0, 72);
  }
});

overlay.draw(() => {
  t.clear();
  t.printAlign("left", "top");
  t.charColor(255, 230, 130);
  t.cellColor(12, 16, 28);
  t.print("toString preview", -20, -11);
  t.charColor(210, 245, 255);
  t.print(textPreview, -20, -9);
});`,
			},
			{
				id: 'export-svg-metadata',
				name: 'SVG metadata',
				description: 'Calls toSVG safely and reports markup size while keeping all output inside the sketch.',
				category: 'safe-export',
				code: `t.fontSize(18);

let svgSummary = "SVG export will be inspected here";
const readout = t.layers.add({ fontSize: 12, blendMode: t.BLEND_ADDITIVE, opacity: 0.85 });

t.draw(() => {
  t.background(6, 8, 18);
  t.charColor(255, 140, 120);
  t.cellColor(0, 0, 0, 0);
  t.char("#");
  t.rect(14 + Math.sin(t.secs) * 4, 7 + Math.cos(t.secs * 1.2) * 2);

  t.charColor(130, 220, 255);
  t.char(".");
  for (let i = 0; i < 40; i++) {
    const angle = i / 40 * Math.PI * 2;
    t.push();
    t.translate(Math.cos(angle) * 18, Math.sin(angle) * 8);
    t.point();
    t.pop();
  }
});

t.finalDraw(() => {
  if (t.frameCount % 60 === 0) {
    const svg = t.toSVG({
      includeBackgroundRectangles: false,
      drawMode: "stroke",
      strokeWidth: 1.2
    });
    svgSummary = "toSVG produced " + svg.length + " characters";
  }
});

readout.draw(() => {
  t.clear();
  t.printAlign("center", "bottom");
  t.charColor(255, 245, 175);
  t.cellColor(0, 0, 0, 0);
  t.print(svgSummary, 0, 11);
});`,
			},
			{
				id: 'export-json-layer-stack',
				name: 'JSON layer stack',
				description: 'Inspects a structured JSON document for multiple layers without saving a file.',
				category: 'safe-export',
				code: `t.fontSize(16);

let jsonSummary = "JSON export will be inspected here";
const accent = t.layers.add({ fontSize: 24, blendMode: t.BLEND_SCREEN, opacity: 0.7 });
const readout = t.layers.add({ fontSize: 12, blendMode: t.BLEND_ADDITIVE, opacity: 0.9 });

t.draw(() => {
  t.background(5, 7, 14);
  t.charColor(120, 255, 185);
  t.cellColor(0, 0, 0, 0);
  t.printAlign("center", "middle");
  t.print("EXPORT", 0, 0);
});

accent.draw(() => {
  t.clear();
  t.charColor(255, 140, 210);
  t.cellColor(0, 0, 0, 0);
  t.char("*");
  t.rect(8 + Math.sin(t.secs * 1.3) * 3, 4);
  accent.rotateZ(t.secs * 12);
});

t.finalDraw(() => {
  if (t.frameCount % 75 === 0) {
    const jsonDoc = t.toJSON({ target: "all", colorMode: "hex", includeMetadata: false });
    const layerCount = jsonDoc.target === "all" ? jsonDoc.layers.length : 1;
    jsonSummary = "toJSON target: " + jsonDoc.target + " / layers: " + layerCount;
  }
});

readout.draw(() => {
  t.clear();
  t.printAlign("center", "bottom");
  t.charColor(255, 235, 150);
  t.cellColor(0, 0, 0, 0);
  t.print(jsonSummary, 0, 11);
});`,
			},
		],
	},
];
