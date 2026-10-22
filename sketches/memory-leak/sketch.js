const EXTENT = 32;
const WORM_COUNT = 16;
const SYMBOLS = '#%*+=:.@';
const CAMERA_INTERVAL = 180;
const CAMERA_TRAVEL = 90;
const CAMERA_PITCHES = [-90, -30, 0, 30, 90];
const CAMERA_VIEWS = Array.from({ length: 40 }, (_, i) => [Math.floor(i / 5) * 45, CAMERA_PITCHES[i % 5]]);
let worms = [];
let viewFrame = 0, fromYaw = 45, fromPitch = 30, toYaw = 45, toPitch = 30;
let black, white, ambient;
const eye = { x: 0, y: 0, z: 0 };
const candidates = Array.from({ length: 6 }, () => ({ axis: 0, sign: 0, room: 0 }));

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
		offsets: Array.from({ length: copies }, (_, copy) => (copy - (copies - 1) / 2) * spacing),
		color: t.color(roll(65, 230), roll(65, 230), roll(65, 230)),
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
	let count = 0;
	for (let axis = 0; axis < 3; axis++) {
		if (axis === worm.axis) continue;
		for (let sign = -1; sign <= 1; sign += 2) {
			const room = worm.bounds[axis] - sign * last.point[axis];
			if (room < 3) continue;
			const candidate = candidates[count++];
			candidate.axis = axis;
			candidate.sign = sign;
			candidate.room = room;
		}
	}
	const { axis, sign, room } = candidates[roll(0, count - 1)];
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

function face(glyph, x, y, z, width, height, rotationX, rotationY) {
	// Each worm starts at identity; reset only its model transform between faces.
	t.resetMatrix();
	t.translate(x, y, z);
	t.rotateX(rotationX);
	t.rotateY(rotationY);
	t.char(glyph);
	t.rect(width, height);
}

function prism(x, y, z, w, h, d, glyphs) {
	// The same six world-facing materials continue through every bend.
	face(glyphs[0], x + w / 2, y, z, d, h, 0, 90);
	face(glyphs[1], x - w / 2, y, z, d, h, 0, -90);
	face(glyphs[2], x, y + h / 2, z, w, d, 90, 0);
	face(glyphs[3], x, y - h / 2, z, w, d, -90, 0);
	face(glyphs[4], x, y, z + d / 2, w, h, 0, 0);
	face(glyphs[5], x, y, z - d / 2, w, h, 0, 180);
}

function drawWorm(worm) {
	t.charColor(worm.color);
	t.push();
	for (let i = 1; i < worm.route.length; i++) {
		const a = worm.route[i - 1];
		const b = worm.route[i];
		const from = Math.max(worm.tail, a.distance);
		const to = Math.min(worm.head, b.distance);
		if (to <= from) continue;
		const length = b.distance - a.distance;
		const x0 = a.point[0] + ((b.point[0] - a.point[0]) * (from - a.distance)) / length;
		const y0 = a.point[1] + ((b.point[1] - a.point[1]) * (from - a.distance)) / length;
		const z0 = a.point[2] + ((b.point[2] - a.point[2]) * (from - a.distance)) / length;
		const x1 = a.point[0] + ((b.point[0] - a.point[0]) * (to - a.distance)) / length;
		const y1 = a.point[1] + ((b.point[1] - a.point[1]) * (to - a.distance)) / length;
		const z1 = a.point[2] + ((b.point[2] - a.point[2]) * (to - a.distance)) / length;
		const w = Math.abs(x1 - x0) + worm.width;
		const h = Math.abs(y1 - y0) + worm.width;
		const d = Math.abs(z1 - z0) + worm.width;

		for (let copy = 0; copy < worm.copies; copy++) {
			const offset = worm.offsets[copy];
			const x = (x0 + x1) / 2 + (worm.spreadAxis === 0 ? offset : 0);
			const y = (y0 + y1) / 2 + (worm.spreadAxis === 1 ? offset : 0);
			const z = (z0 + z1) / 2 + (worm.spreadAxis === 2 ? offset : 0);
			prism(x, y, z, w, h, d, worm.glyphs);
		}
	}
	t.pop();
}

function orbitCamera() {
	if (++viewFrame % CAMERA_INTERVAL === 0) {
		const longitude = (toYaw % 360 + 360) % 360;
		const excluded = (longitude / 45) * 5 + CAMERA_PITCHES.indexOf(toPitch);
		const choice = roll(0, CAMERA_VIEWS.length - 2);
		const [yaw, pitch] = CAMERA_VIEWS[choice >= excluded ? choice + 1 : choice];
		fromYaw = toYaw;
		fromPitch = toPitch;
		toYaw = toYaw + (yaw - longitude + 540) % 360 - 180;
		toPitch = pitch;
	}
	const progress = Math.min(1, (viewFrame % CAMERA_INTERVAL) / CAMERA_TRAVEL);
	const ease = progress ** 3 * (progress * (progress * 6 - 15) + 10);
	// Keep longitude unwrapped and take the shorter arc across 360°.
	const yaw = (fromYaw + (toYaw - fromYaw) * ease) * Math.PI / 180;
	const pitch = (fromPitch + (toPitch - fromPitch) * ease) * Math.PI / 180;
	// This tangent stays perpendicular to the view, including directly above/below.
	const upX = Math.sin(yaw) * Math.sin(pitch);
	const upY = Math.cos(pitch);
	const upZ = Math.cos(yaw) * Math.sin(pitch);
	// Keep the original addition to zero, including its signed-zero behavior.
	eye.x = 0 + 260 * (Math.sin(yaw) * Math.cos(pitch));
	eye.y = 0 + 260 * -Math.sin(pitch);
	eye.z = 0 + 260 * (Math.cos(yaw) * Math.cos(pitch));
	t.camera(eye.x, eye.y, eye.z, 0, 0, 0, upX, upY, upZ);
	return eye;
}

t.fontSize(8);

t.setup(() => {
	t.randomSeed('memory-leak');
	black = t.color(0);
	white = t.color(255);
	ambient = t.color(100);
	t.ortho(0.1, 2048);
	worms = Array.from({ length: WORM_COUNT }, createWorm);
});

t.draw(() => {
	t.background(black);
	const eye = orbitCamera();
	t.ambientLight(ambient);
	t.pointLight(white, eye);
	t.cellColor(black);

	for (let i = 0; i < worms.length; i++) {
		advance(worms[i]);
		if (worms[i].tail >= worms[i].head) worms[i] = createWorm();
		drawWorm(worms[i]);
	}
});
