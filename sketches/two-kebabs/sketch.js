const CHAIN_LENGTH = 256;
const TAU = Math.PI * 2;
const BACKGROUND = '#aaa';
const COLORS = ['#111', '#4b4b4b', '#f3f3f3'];
const PATTERNS = ['.:+*=', '/\\_-|', '(){}[]', '001101', '<>^v', 'xX#', '$s!?'];

let chainA = [];
let chainB = [];
function integer(min, max) {
	return Math.floor(t.random(min, max + 1));
}

function modulo(value, length) {
	return ((value % length) + length) % length;
}

function createBand() {
	const shadeRoll = t.random();
	return {
		pattern: PATTERNS[integer(0, PATTERNS.length - 1)],
		radius: 0.28 + Math.pow(t.random(), 0.7) * 0.72,
		repeats: integer(1, 4),
		phase: t.random(TAU),
		shade: shadeRoll < 0.05 ? 2 : shadeRoll < 0.25 ? 1 : 0,
	};
}

function buildChain(seed) {
	t.randomSeed(seed);
	const chain = [];
	while (chain.length < CHAIN_LENGTH) {
		const band = createBand();
		const length = integer(2, 10);
		for (let row = 0; row < length && chain.length < CHAIN_LENGTH; row++) chain.push(band);
	}
	return chain;
}

function projectRow(band, row, time, maxRadius) {
	const pulse = Math.sin(time * 0.31 + row * 0.17 + band.phase) * 0.08;
	const radius = Math.max(3, Math.round(maxRadius * (band.radius + pulse)));
	const twist =
		time * 0.14 + band.phase + row * 0.015 + Math.sin(time * 0.21 + row * 0.11) * 0.11;
	const characters = new Array(radius * 2 + 1);

	for (let column = -radius; column <= radius; column++) {
		const surface = Math.acos(Math.max(-1, Math.min(1, column / radius))) / Math.PI;
		const index = modulo(Math.floor((surface * band.repeats + twist) * band.pattern.length), band.pattern.length);
		characters[column + radius] = Math.abs(column) === radius ? '|' : band.pattern[index];
	}
	return characters.join('');
}

t.fontSize(16);

t.setup(() => {
	t.noiseSeed('textmodetower-v1');
	chainA = buildChain('textmodetower-a');
	chainB = buildChain('textmodetower-b');
});

t.draw(() => {
	if (!chainA.length || !chainB.length) return;
	t.background(BACKGROUND);
	t.printAlign('center', 'top');
	t.cellColor(0, 0, 0, 0);

	const time = t.secs;
	const phase = time * 0.22 + 1.6 * (t.noise(time * 0.045) - 0.5);
	const travelA = Math.sin(phase) * chainA.length * 0.38;
	const travelB = Math.sin(phase + 1.8) * chainB.length * 0.38;
	const top = -Math.floor(t.grid.rows / 2);

	const halfCols = Math.floor(t.grid.cols / 2);
	const maxRadius = Math.max(3, Math.min(16, Math.floor(halfCols * 0.42)));
	const offset = Math.floor(t.grid.cols / 4);

	for (let row = 0; row < t.grid.rows; row++) {
		const bandA = chainA[modulo(Math.floor(travelA) + row, chainA.length)];
		const bandB = chainB[modulo(Math.floor(travelB) + row, chainB.length)];
		const sway =
			Math.sin(time * 0.19 + row * 0.09) * 0.9 +
			Math.sin(time * 0.07 - row * 0.04) * 0.35;

		t.charColor(COLORS[bandA.shade]);
		t.print(projectRow(bandA, row, time, maxRadius), sway - offset, top + row);

		t.charColor(COLORS[bandB.shade]);
		t.print(projectRow(bandB, row, time, maxRadius), sway + offset, top + row);
	}
});
