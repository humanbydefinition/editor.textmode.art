const KEBAB_LENGTH = 256;
const TAU = Math.PI * 2;
const BACKGROUND = '#e8d5b7';
const CHAR_COLORS = ['#2c1810', '#a0522d', '#f5deb3'];
const CELL_COLORS = ['#c4885a', '#e0c090', '#6b3a20'];
const FONT_SIZE = 16;
const PATTERNS = ['.:+*=', '/\\_-|', '(){}[]', '001101', '<>^v', 'xX#', '$s!?'];

let leftKebab = [],
	rightKebab = [];

const integer = (min, max) => Math.floor(t.random(min, max + 1));
const modulo = (value, length) => ((value % length) + length) % length;

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
		for (let localRow = 0; localRow < length && kebab.length < KEBAB_LENGTH; localRow++)
			kebab.push({ morsel, localRow });
	}
	return kebab;
}

function skewerRow(morsel, localRow, time, maxRadius) {
	const radius = Math.max(3, Math.round(maxRadius * morsel.radius));
	const characters = new Array(radius * 2 + 1);
	const twist =
		time * 0.14 + morsel.phase + localRow * 0.015 + Math.sin(time * 0.21 + localRow * 0.11) * 0.11;

	for (let column = -radius; column <= radius; column++) {
		const surface = Math.acos(Math.max(-1, Math.min(1, column / radius))) / Math.PI;
		const index = modulo(
			Math.floor((surface * morsel.repeats + twist) * morsel.pattern.length),
			morsel.pattern.length
		);
		characters[column + radius] = morsel.pattern[index];
	}
	return characters.join('');
}

function drawKebab(kebab, travel, centerX, top, time, maxRadius) {
	const startRow = Math.floor(travel);
	const fraction = travel - startRow;

	t.push();
	t.translate(centerX, -fraction);
	for (let screenRow = 0; screenRow <= t.grid.rows; screenRow++) {
		const { morsel, localRow } = kebab[modulo(startRow + screenRow, kebab.length)];
		t.cellColor(CELL_COLORS[morsel.shade]);
		t.charColor(CHAR_COLORS[morsel.shade]);
		t.print(skewerRow(morsel, localRow, time, maxRadius), 0, top + screenRow, { markup: false });
	}
	t.pop();
}

t.fontSize(FONT_SIZE);

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
	const leftTravel = Math.sin(phase) * leftKebab.length * 0.38;
	const rightTravel = Math.sin(phase + 1.8) * rightKebab.length * 0.38;
	const top = -Math.floor(t.grid.rows / 2);

	const halfCols = Math.floor(t.grid.cols / 2);
	const maxRadius = Math.max(3, Math.min(16, Math.floor(halfCols * 0.42)));
	const offset = Math.floor(t.grid.cols / 4);

	drawKebab(leftKebab, leftTravel, -offset, top, time, maxRadius);
	drawKebab(rightKebab, rightTravel, offset, top, time, maxRadius);
});
