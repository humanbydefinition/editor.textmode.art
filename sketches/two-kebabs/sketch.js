const KEBAB_LENGTH = 256;
const TAU = Math.PI * 2;
const BACKGROUND = '#e8d5b7';
const COLORS = ['#2c1810', '#a0522d', '#f5deb3'];
const CELLS = [
	[196, 136, 90],
	[224, 192, 144],
	[107, 58, 32],
];
const PATTERNS = ['.:+*=', '/\\_-|', '(){}[]', '001101', '<>^v', 'xX#', '$s!?'];

let leftKebab = [];
let rightKebab = [];
function integer(min, max) {
	return Math.floor(t.random(min, max + 1));
}

function modulo(value, length) {
	return ((value % length) + length) % length;
}

function createMorsel() {
	const shadeRoll = t.random();
	return {
		pattern: PATTERNS[integer(0, PATTERNS.length - 1)],
		radius: 0.28 + Math.pow(t.random(), 0.7) * 0.72,
		repeats: integer(1, 4),
		phase: t.random(TAU),
		shade: shadeRoll < 0.05 ? 2 : shadeRoll < 0.25 ? 1 : 0,
	};
}

function buildKebab(seed) {
	t.randomSeed(seed);
	const kebab = [];
	while (kebab.length < KEBAB_LENGTH) {
		const morsel = createMorsel();
		const length = integer(2, 10);
		for (let row = 0; row < length && kebab.length < KEBAB_LENGTH; row++) kebab.push(morsel);
	}
	return kebab;
}

function skewerRow(morsel, row, time, maxRadius) {
	const sizzle = Math.sin(time * 0.31 + row * 0.17 + morsel.phase) * 0.08;
	const radius = Math.max(3, Math.round(maxRadius * (morsel.radius + sizzle)));
	const twist =
		time * 0.14 + morsel.phase + row * 0.015 + Math.sin(time * 0.21 + row * 0.11) * 0.11;
	const characters = new Array(radius * 2 + 1);

	for (let column = -radius; column <= radius; column++) {
		const surface = Math.acos(Math.max(-1, Math.min(1, column / radius))) / Math.PI;
		const index = modulo(Math.floor((surface * morsel.repeats + twist) * morsel.pattern.length), morsel.pattern.length);
		characters[column + radius] = morsel.pattern[index];
	}
	return characters.join('');
}

t.fontSize(16);

t.setup(() => {
	t.noiseSeed('two-kebabs-v1');
	leftKebab = buildKebab('two-kebabs-left');
	rightKebab = buildKebab('two-kebabs-right');
});

t.draw(() => {
	if (!leftKebab.length || !rightKebab.length) return;
	t.background(BACKGROUND);
	t.printAlign('center', 'top');

	const time = t.secs;
	const phase = time * 0.22 + 1.6 * (t.noise(time * 0.045) - 0.5);
	const leftSkewer = Math.sin(phase) * leftKebab.length * 0.38;
	const rightSkewer = Math.sin(phase + 1.8) * rightKebab.length * 0.38;
	const top = -Math.floor(t.grid.rows / 2);

	const halfCols = Math.floor(t.grid.cols / 2);
	const maxRadius = Math.max(3, Math.min(16, Math.floor(halfCols * 0.42)));
	const offset = Math.floor(t.grid.cols / 4);

	for (let row = 0; row < t.grid.rows; row++) {
		const morselA = leftKebab[modulo(Math.floor(leftSkewer) + row, leftKebab.length)];
		const morselB = rightKebab[modulo(Math.floor(rightSkewer) + row, rightKebab.length)];
		const sway =
			Math.sin(time * 0.19 + row * 0.09) * 0.9 +
			Math.sin(time * 0.07 - row * 0.04) * 0.35;

		const cellA = CELLS[morselA.shade];
		t.cellColor(cellA[0], cellA[1], cellA[2], 255);
		t.charColor(COLORS[morselA.shade]);
		t.print(skewerRow(morselA, row, time, maxRadius), sway - offset, top + row);

		const cellB = CELLS[morselB.shade];
		t.cellColor(cellB[0], cellB[1], cellB[2], 255);
		t.charColor(COLORS[morselB.shade]);
		t.print(skewerRow(morselB, row, time, maxRadius), sway + offset, top + row);
	}
});
