const WORLD_SIZE = 64, WALKER_COUNT = 8, BACKGROUND = '#000';
const THICKNESS_MIN = 1, THICKNESS_MAX = 4, BUNDLE_COUNT_MIN = 1, BUNDLE_COUNT_MAX = 4;
const AXES = 'xyz', GLYPHS = '#%*+=:.@';
const DIRECTIONS = [...AXES].flatMap((axis) => [1, -1].map((step) => ({ x: 0, y: 0, z: 0, [axis]: step })));
const FACES = [[0, 1, 0, 0, 0, 0], [0, 1, 0, 1, 0, 0], [0, 0, 1, 0, 1, 1], [1, 0, 0, 1, 1, 2]];

let walkers = [], simulationStep = 0;
const occupancy = new Map();

t.fontSize(8);

const integer = (min, max) => Math.floor(t.random(min, max + 1));
const choose = (values) => values[integer(0, values.length - 1)];
const stamp = (index) => simulationStep * WALKER_COUNT + index;
const nextPoint = (p, d) => ({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z });
const voxelKey = (x, y, z) => x + y * WORLD_SIZE + z * WORLD_SIZE * WORLD_SIZE;
const inWorld = (x, y, z) => x >= 0 && x < WORLD_SIZE && y >= 0 && y < WORLD_SIZE && z >= 0 && z < WORLD_SIZE;
const hasVoxel = (x, y, z) => inWorld(x, y, z) && occupancy.has(voxelKey(x, y, z));

function randomPalette() {
	const base = [integer(40, 220), integer(40, 220), integer(40, 220)];
	return [base.map((v) => Math.round(v + (255 - v) * 0.55)), base, base.map((v) => Math.round(v * 0.45))];
}

function spawnWalker(index) {
	const thickness = integer(THICKNESS_MIN, THICKNESS_MAX);
	const bundleCount = integer(BUNDLE_COUNT_MIN, BUNDLE_COUNT_MAX);
	const bundleAxis = choose(AXES), bundleSpacing = (thickness + 1) * 3;
	const bundleOffsets = Array.from({ length: bundleCount }, (_, i) => (i - Math.floor(bundleCount / 2)) * bundleSpacing);
	const low = Math.floor(thickness / 2), high = thickness - low - 1;

	const limits = Object.fromEntries([...AXES].map((axis) => {
		const min = axis === bundleAxis ? bundleOffsets[0] : 0;
		const max = axis === bundleAxis ? bundleOffsets.at(-1) : 0;
		return [axis, [1 + low - min, WORLD_SIZE - 2 - high - max]];
	}));

	const position = Object.fromEntries([...AXES].map((axis) => [axis, integer(...limits[axis])]));

	return {
		index, position, direction: choose(DIRECTIONS),
		trail: [{ ...position, stamp: stamp(index) }], trailLimit: integer(16, 40),
		thickness, bundleAxis, bundleOffsets, limits, age: 0, lifespan: integer(180, 320),
		phase: 'growing', eraseEvery: integer(3, 5), eraseTick: 0,
		turnChance: t.random(0.07, 0.17), stepEvery: thickness === 3 ? 2 : choose([1, 1, 2]),
		stepOffset: index % 2, glyphs: [choose(GLYPHS), choose(GLYPHS), choose(GLYPHS)], colors: randomPalette(),
	};
}

function fits(walker, point) {
	return [...AXES].every((axis) => {
		const [min, max] = walker.limits[axis];
		return point[axis] >= min && point[axis] <= max;
	});
}

function chooseDirection(walker, forceTurn) {
	if (!forceTurn && t.random() >= walker.turnChance) return;

	const d = walker.direction;
	let candidates = DIRECTIONS.filter((c) =>
		c.x * d.x + c.y * d.y + c.z * d.z === 0 &&
		fits(walker, nextPoint(walker.position, c))
	);

	if (!candidates.length) candidates = DIRECTIONS.filter((c) => fits(walker, nextPoint(walker.position, c)));
	if (candidates.length) walker.direction = choose(candidates);
}

function advanceWalker(index) {
	const walker = walkers[index];
	if ((simulationStep + walker.stepOffset) % walker.stepEvery) return;

	if (walker.phase === 'erasing') {
		if (++walker.eraseTick < walker.eraseEvery) return;

		walker.eraseTick = 0;
		walker.trail.shift();
		if (!walker.trail.length) walkers[index] = spawnWalker(index);
		return;
	}

	if (walker.age >= walker.lifespan) return void (walker.phase = 'erasing');

	chooseDirection(walker, !fits(walker, nextPoint(walker.position, walker.direction)));

	const target = nextPoint(walker.position, walker.direction);
	if (!fits(walker, target)) return;

	walker.position = target;
	walker.trail.push({ ...target, stamp: stamp(index) });
	if (walker.trail.length > walker.trailLimit) walker.trail.shift();
	walker.age++;
}

function rebuildOccupancy() {
	occupancy.clear();

	for (const walker of walkers) {
		const low = Math.floor(walker.thickness / 2);

		for (const point of walker.trail) for (const offset of walker.bundleOffsets) {
			const bx = point.x + (walker.bundleAxis === 'x' ? offset : 0);
			const by = point.y + (walker.bundleAxis === 'y' ? offset : 0);
			const bz = point.z + (walker.bundleAxis === 'z' ? offset : 0);

			for (let oz = 0; oz < walker.thickness; oz++)
				for (let oy = 0; oy < walker.thickness; oy++)
					for (let ox = 0; ox < walker.thickness; ox++) {
						const x = bx + ox - low, y = by + oy - low, z = bz + oz - low;
						if (!inWorld(x, y, z)) continue;

						const key = voxelKey(x, y, z), previous = occupancy.get(key);
						if (!previous || previous.stamp <= point.stamp)
							occupancy.set(key, { walker: walker.index, stamp: point.stamp, x, y, z });
					}
		}
	}
}

function drawCell(x, y, glyph, color, bounds) {
	if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) return;
	t.push(); t.translate(x, y); t.char(glyph); t.charColor(...color); t.point(); t.pop();
}

t.setup(() => {
	t.randomSeed('textmodearray-v1');
	walkers = Array.from({ length: WALKER_COUNT }, (_, index) => spawnWalker(index));
});

t.draw(() => {
	for (let index = 0; index < walkers.length; index++) advanceWalker(index);
	simulationStep++;
	rebuildOccupancy();

	t.background(BACKGROUND);
	t.cellColor(BACKGROUND);

	const { cols, rows } = t.grid;
	const bounds = {
		minX: -Math.floor(cols / 2),
		maxX: Math.floor(cols / 2) - 1,
		minY: -Math.floor(rows / 2),
		maxY: Math.floor(rows / 2) - 1,
	};

	const scale = Math.max(0.45, Math.min(1,
		(cols - 8) / (WORLD_SIZE * 2 + 2),
		(rows - 8) / (WORLD_SIZE * 2 + 2)
	));

	const originX = cols > 100 ? Math.floor((cols - 100) * 0.4) : 0;
	const voxels = [...occupancy.values()].sort((a, b) => a.x + a.y + a.z - b.x - b.y - b.z);

	for (const voxel of voxels) {
		const px = Math.round(originX + (voxel.x - voxel.z) * scale);
		const py = Math.round(2 + ((voxel.x + voxel.z) * 0.5 - voxel.y) * scale);
		const walker = walkers[voxel.walker];

		for (const [nx, ny, nz, dx, dy, shade] of FACES)
			if (!hasVoxel(voxel.x + nx, voxel.y + ny, voxel.z + nz))
				drawCell(px + dx, py + dy, walker.glyphs[shade], walker.colors[shade], bounds);
	}
});