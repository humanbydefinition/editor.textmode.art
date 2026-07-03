import type { ExampleCategory } from '@/features/examples/types';

const figFontUrl = 'https://cdn.jsdelivr.net/gh/xero/figlet-fonts@master/Bulbhead.flf';

export const figletExampleCategories: ExampleCategory[] = [
	{
		id: 'figlet-text',
		displayName: 'FIGlet text',
		examples: [
			{
				id: 'figlet-load-render-fallback',
				name: 'load and render',
				description: 'Loads a FIGfont, renders centered FIGlet text, and shows a visible fallback while loading or offline.',
				category: 'figlet-text',
				code: `let figFont = null;
let fontStatus = "loading remote FIGfont...";

t.fontSize(8);
t.figTextAlign("center");
t.figTextBaseline("center");

t.setup(async () => {
  try {
    figFont = await t.loadFigFont("${figFontUrl}");
    t.figFont(figFont);
    fontStatus = "Bulbhead FIGfont loaded";
  } catch (error) {
    fontStatus = "FIGfont unavailable; using fallback text";
  }
});

t.draw(() => {
  t.background(6, 8, 18);
  t.charColor(120, 240, 255);
  t.cellColor(0, 0, 0, 0);

  if (figFont) {
    t.figText("EDITOR", 0, -1, { horizontalLayout: "fitted" });
  } else {
    t.printAlign("center", "middle");
    t.print("EDITOR", 0, -1);
  }

  t.charColor(255, 215, 105);
  t.printAlign("center", "bottom");
  t.print(fontStatus, 0, 11);
});`,
			},
			{
				id: 'figlet-alignment-layout',
				name: 'alignment and layout',
				description: 'Cycles FIGlet alignment and horizontal layouts with a text fallback for offline sessions.',
				category: 'figlet-text',
				code: `let figFont = null;
let fontStatus = "loading remote FIGfont...";

t.fontSize(8);
t.figTextBaseline("center");

t.setup(async () => {
  try {
    figFont = await t.loadFigFont("${figFontUrl}");
    t.figFont(figFont);
    fontStatus = "FIGfont ready";
  } catch (error) {
    fontStatus = "fallback text path";
  }
});

t.draw(() => {
  const phase = Math.floor(t.secs * 0.7) % 3;
  const align = phase === 0 ? "left" : phase === 1 ? "center" : "right";
  const layout = phase === 0 ? "full" : phase === 1 ? "fitted" : "smushed";

  t.background(7, 9, 19);
  t.charColor(245, 245, 255);
  t.cellColor(0, 0, 0, 0);
  t.figTextAlign(align);

  if (figFont) {
    const x = align === "left" ? -28 : align === "right" ? 28 : 0;
    t.figText("TYPE", x, -1, { horizontalLayout: layout });
  } else {
    t.printAlign(align, "middle");
    t.print("TYPE", align === "left" ? -28 : align === "right" ? 28 : 0, -1);
  }

  t.printAlign("center", "bottom");
  t.charColor(120, 240, 180);
  t.print("align: " + align + " / layout: " + layout + " / " + fontStatus, 0, 11);
});`,
			},
			{
				id: 'figlet-measuring-bounds',
				name: 'measuring bounds',
				description: 'Uses FIGlet measurement helpers to frame rendered text, with a fallback status path.',
				category: 'figlet-text',
				code: `let figFont = null;
let bounds = { cols: 10, rows: 1 };
let fontStatus = "loading remote FIGfont...";

t.fontSize(8);
t.figTextAlign("center");
t.figTextBaseline("center");

t.setup(async () => {
  try {
    figFont = await t.loadFigFont("${figFontUrl}");
    t.figFont(figFont);
    bounds = t.figTextBounds("BOUNDS", { horizontalLayout: "fitted" });
    fontStatus = "measured " + bounds.cols + " x " + bounds.rows + " cells";
  } catch (error) {
    fontStatus = "fallback: remote FIGfont unavailable";
  }
});

t.draw(() => {
  t.background(5, 7, 16);
  t.charColor(85, 140, 255);
  t.cellColor(0, 0, 0, 0);
  t.char(".");
  t.rect(bounds.cols + 4, bounds.rows + 4);

  t.charColor(255, 240, 145);
  if (figFont) {
    t.figText("BOUNDS", 0, 0, { horizontalLayout: "fitted" });
  } else {
    t.printAlign("center", "middle");
    t.print("BOUNDS", 0, 0);
  }

  t.printAlign("center", "bottom");
  t.charColor(165, 255, 210);
  t.print(fontStatus, 0, 11);
});`,
			},
		],
	},
];
