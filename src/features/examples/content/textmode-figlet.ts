import type { ExampleCategory } from '@/features/examples/types';

export const figletExampleCategories: ExampleCategory[] = [
	{
		id: 'specimens',
		displayName: 'Multi-font generative specimens',
		examples: [
			{
				id: 'figlet-font-strata',
				name: 'font strata',
				description: 'loads five FIGlet fonts and stacks the same word through each in generative layers',
				code: `t.fontSize(8);

const BASE = 'https://cdn.jsdelivr.net/gh/xero/figlet-fonts@main/';
const FONT_NAMES = ['Big', 'Slant', 'Doom', 'Ghost', 'Small'];
const WORD = 'TYPE';

let fonts = [];

t.setup(async () => {
	fonts = await Promise.all(
		FONT_NAMES.map((name) => t.loadFigFont(BASE + encodeURIComponent(name) + '.flf'))
	);
	t.figTextAlign('center');
	t.figTextBaseline('center');
});

t.draw(() => {
	t.background(8, 10, 16);
	if (!fonts.length) return;

	const rows = t.grid.rows;
	const hh = Math.floor(rows / 2);
	const time = t.secs;
	const bandH = Math.max(...fonts.map((f) => f.height)) + 4;
	const count = Math.min(fonts.length, Math.max(1, Math.floor(rows / bandH)));
	const step = Math.floor((rows - 24) / Math.max(1, count - 1));

	t.printAlign('center', 'top');

	for (let i = 0; i < count; i++) {
		const font = fonts[i];
		const y = -hh + 12 + i * step + Math.round(Math.sin(time * 0.5 + i * 1.3));
		const wave = 0.5 + 0.5 * Math.sin(time * 0.9 - i * 0.7);
		const dim = 0.35 + 0.65 * wave;

		t.figFont(font);
		t.figText(WORD, 0, y, {
			horizontalLayout: 'fitted',
			charColor: (cell) => {
				const n = t.noise(
					cell.col * 0.14 + Math.sin(time * 0.3 + i) * 0.9,
					cell.row * 0.1 - time * 0.12 + i * 0.9
				);
				const nearBase = 1 - cell.subRow / font.height;
				const hot = n > 0.9 ? 70 : 0;
				return [
					Math.round((60 + 200 * n * nearBase) * dim + hot),
					Math.round((110 + 140 * n) * dim + hot * 0.4),
					Math.round((180 + 70 * nearBase + i * 16) * dim),
				];
			},
			cellColor: (cell) => {
				const n = t.noise(cell.col * 0.08, cell.row * 0.08 + time * 0.06);
				return [Math.round(28 * n * wave), Math.round(20 * n * wave), Math.round(44 * n * wave), 0.7];
			},
		});

		t.charColor(Math.round(110 * dim), Math.round(140 * dim), Math.round(185 * dim));
		t.print(FONT_NAMES[i], 0, y + Math.floor(font.height / 2) + 1);
	}
});
`,
			},
		],
	},
];
