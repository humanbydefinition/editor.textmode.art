const EXTENT = 48;
const WORM_COUNT = 32;
const SYMBOLS = '#%*+=:.@';
const CAMERA_INTERVAL = 180;
const CAMERA_TRAVEL = 90;
const CAMERA_PITCHES = [-90, -30, 0, 30, 90];
const CAMERA_VIEWS = Array.from({ length: 40 }, (_, i) => [Math.floor(i / 5) * 45, CAMERA_PITCHES[i % 5]]);
let worms = [];
let viewFrame = 0, viewFrom = [45, 30], viewTo = [45, 30];

const roll = (low, high) => Math.floor(t.random(low, high + 1));

function createWorm() {
	const width = roll(1, 4);
	const copies = roll(1, 4);
	const spacing = (width + 1) * 3;
	const spreadAxis = roll(0, 2);
	const margin = width / 2 + ((copies - 1) * spacing) / 2;
	const bounds = [0, 1, 2].map((axis) => EXTENT - (axis === spreadAxis ? margin : width / 2));
	const start = bounds.map((limit) => t.random(-limit, limit));
	const available = [...SYMBOLS];
	const glyphs = Array.from({ length: 6 }, () => available.splice(roll(0, available.length - 1), 1)[0]);

	return {
		width, copies, spacing, spreadAxis, bounds, glyphs,
		color: [roll(65, 230), roll(65, 230), roll(65, 230)],
		route: [{ point: start, distance: 0 }],
		axis: -1,
		head: 0,
		tail: 0,
		length: roll(18, 40),
		speed: t.random(0.45, 0.95),
		remaining: roll(180, 320),
	};
}

function extendRoute(worm) {
	const last = worm.route.at(-1);
	// Pick a new axis and a run length, rather than making per-voxel decisions.
	const options = [];
	for (let axis = 0; axis < 3; axis++) {
		if (axis === worm.axis) continue;
		for (const sign of [-1, 1]) {
			const room = worm.bounds[axis] - sign * last.point[axis];
			if (room >= 3) options.push({ axis, sign, room });
		}
	}
	const { axis, sign, room } = options[roll(0, options.length - 1)];
	const length = Math.min(room, roll(4, 13));
	const point = [...last.point];
	point[axis] += sign * length;
	worm.route.push({ point, distance: last.distance + length });
	worm.axis = axis;
}

function advance(worm) {
	if (worm.remaining > 0) {
		worm.head += worm.speed;
		worm.remaining--;
		while (worm.route.at(-1).distance <= worm.head) extendRoute(worm);
		worm.tail = Math.max(0, worm.head - worm.length);
	} else {
		worm.tail = Math.min(worm.head, worm.tail + worm.speed / 3);
	}
	// Keep only the segments intersected by the head-to-tail interval.
	while (worm.route.length > 2 && worm.route[1].distance <= worm.tail) worm.route.shift();
}

function face(glyph, center, width, height, rotationX, rotationY) {
	t.push();
	t.translate(...center);
	t.rotateX(rotationX);
	t.rotateY(rotationY);
	t.char(glyph);
	t.rect(width, height);
	t.pop();
}

function prism(center, size, glyphs) {
	const [x, y, z] = center;
	const [w, h, d] = size;
	// The same six world-facing materials continue through every bend.
	face(glyphs[0], [x + w / 2, y, z], d, h, 0, 90);
	face(glyphs[1], [x - w / 2, y, z], d, h, 0, -90);
	face(glyphs[2], [x, y + h / 2, z], w, d, 90, 0);
	face(glyphs[3], [x, y - h / 2, z], w, d, -90, 0);
	face(glyphs[4], [x, y, z + d / 2], w, h, 0, 0);
	face(glyphs[5], [x, y, z - d / 2], w, h, 0, 180);
}

function drawWorm(worm, scale) {
	t.charColor(...worm.color);
	t.cellColor(0);
	for (let i = 1; i < worm.route.length; i++) {
		const a = worm.route[i - 1];
		const b = worm.route[i];
		const from = Math.max(worm.tail, a.distance);
		const to = Math.min(worm.head, b.distance);
		if (to <= from) continue;
		const length = b.distance - a.distance;
		const start = a.point.map((v, axis) => v + ((b.point[axis] - v) * (from - a.distance)) / length);
		const end = a.point.map((v, axis) => v + ((b.point[axis] - v) * (to - a.distance)) / length);
		const size = start.map((v, axis) => (Math.abs(end[axis] - v) + worm.width) * scale[axis]);

		for (let copy = 0; copy < worm.copies; copy++) {
			const center = start.map((v, axis) => {
				const offset = axis === worm.spreadAxis ? (copy - (worm.copies - 1) / 2) * worm.spacing : 0;
				return ((v + end[axis]) / 2 + offset) * scale[axis];
			});
			prism(center, size, worm.glyphs);
		}
	}
}

function orbitCamera() {
	if (++viewFrame % CAMERA_INTERVAL === 0) {
		const longitude = (viewTo[0] % 360 + 360) % 360;
		const choices = CAMERA_VIEWS.filter(([yaw, pitch]) => yaw !== longitude || pitch !== viewTo[1]);
		const [yaw, pitch] = choices[roll(0, choices.length - 1)];
		viewFrom = viewTo;
		viewTo = [viewTo[0] + (yaw - longitude + 540) % 360 - 180, pitch];
	}
	const progress = Math.min(1, (viewFrame % CAMERA_INTERVAL) / CAMERA_TRAVEL);
	const ease = progress ** 3 * (progress * (progress * 6 - 15) + 10);
	// Keep longitude unwrapped and take the shorter arc across 360°.
	const [yaw, pitch] = viewFrom.map((angle, axis) => (angle + (viewTo[axis] - angle) * ease) * Math.PI / 180);
	// This tangent stays perpendicular to the view, including directly above/below.
	const up = [Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), Math.cos(yaw) * Math.sin(pitch)];
	const target = [0, 0, 0];
	const eye = [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]
		.map((value, axis) => target[axis] + 260 * value);
	t.camera(...eye, ...target, ...up);
	return eye;
}

t.fontSize(8);

t.setup(() => {
	t.randomSeed('memory-leak');
	worms = Array.from({ length: WORM_COUNT }, createWorm);
});

t.draw(() => {
	t.background(0);
	t.ortho(0.1, 2048);
	const eye = orbitCamera();
	t.ambientLight(100);
	t.pointLight(255, 255, 255, ...eye);

	const zoom = Math.max(0.05, Math.min(1, (t.grid.cols - 8) / 130, (t.grid.rows - 8) / 130));
	// Compensate for the camera basis so upright and diagonal runs match the old view.
	const scale = [Math.SQRT2 * zoom, (2 / Math.sqrt(3)) * zoom, Math.SQRT2 * zoom];
	for (let i = 0; i < worms.length; i++) {
		advance(worms[i]);
		if (worms[i].tail >= worms[i].head) worms[i] = createWorm();
		drawWorm(worms[i], scale);
	}
});
