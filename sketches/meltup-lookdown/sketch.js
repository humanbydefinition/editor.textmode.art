const FONT_SIZE = 16;
const RECTANGLE_COUNT = 24;
const SOURCE_RECTANGLE_COUNT = 4;
const STATIC_RULE = 8;
const BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/textmode.js@0.17.0/dist/textmode.umd.js';

const SOURCE_PALETTE = [
	'#ffffff', '#6df7c1', '#11adc1', '#606c81',
	'#393457', '#1e8875', '#5bb361', '#a1e55a',
	'#f7e476', '#f99252', '#cb4d68', '#6a3771',
	'#c92464', '#f48cb6', '#f7b69e', '#9b9c82',
];

const REVEAL_CURVES = [
	'inQuad', 'outQuad', 'inOutQuad',
	'inCubic', 'outCubic', 'inOutCubic',
	'inSine', 'outSine', 'inOutSine',
];

const PUSH_SHADER = `#version 300 es
precision highp float;
uniform vec2 u_gridSize;
uniform float u_frame;
uniform int u_rectCount;
uniform vec4 u_rects[64];
uniform int u_rules[64];
uniform sampler2D u_seedCharacter, u_seedPrimaryColor, u_seedSecondaryColor;
uniform sampler2D u_previousCharacter, u_previousPrimaryColor, u_previousSecondaryColor;
layout(location = 0) out vec4 o_character;
layout(location = 1) out vec4 o_primaryColor;
layout(location = 2) out vec4 o_secondaryColor;
const ivec2 DIRECTIONS[8] = ivec2[8](
	ivec2(-1, 1), ivec2(0, 1), ivec2(1, 1), ivec2(-1, 0),
	ivec2(1, 0), ivec2(-1, -1), ivec2(0, -1), ivec2(1, -1)
);

bool inside(vec2 cell, vec4 rect) {
	return all(greaterThanEqual(cell, rect.xy)) && all(lessThan(cell, rect.xy + rect.zw));
}

float random(vec2 cell) {
	return fract(sin(dot(cell, vec2(127.1, 311.7)) + u_frame * 0.001) * 43758.5453);
}

vec4 sampleState(sampler2D history, sampler2D seed, ivec2 cell, bool pinned) {
	return pinned ? texelFetch(seed, cell, 0) : texelFetch(history, cell, 0);
}

void main() {
	ivec2 cell = ivec2(gl_FragCoord.xy);
	ivec2 size = ivec2(u_gridSize);
	int rule = 0;
	for (int i = 0; i < u_rectCount; i++) {
		if (inside(vec2(cell), u_rects[i])) rule = u_rules[i];
	}
	bool pinned = rule == 8;
	ivec2 movement = pinned ? ivec2(0) : (random(vec2(cell)) < 0.15 ? ivec2(0) : DIRECTIONS[min(rule, 7)]);
	ivec2 source = pinned ? cell : (cell - movement + size) % size;
	o_character = sampleState(u_previousCharacter, u_seedCharacter, source, pinned);
	o_primaryColor = sampleState(u_previousPrimaryColor, u_seedPrimaryColor, source, pinned);
	o_secondaryColor = sampleState(u_previousSecondaryColor, u_seedSecondaryColor, source, pinned);
}`;

let sourceLines = [], sourceLoaded = false, sourceReveals = [], cycleStartFrame = 0;
let pushShader, seedFramebuffer, previousFramebuffer, nextFramebuffer, rectangles;

const framebufferSize = () => ({ width: t.grid.cols, height: t.grid.rows });
const area = ({ width, height }) => width * height;
const cellIndexToCentered = (index, dimension) => index - (dimension - 1) / 2;
const shaderRectangle = (rect, height) => [rect.x, height - rect.y - rect.height, rect.width, rect.height];

function wrapLines(lines, width) {
	if (width < 1) return [];
	const wrapped = [];
	for (const line of lines) {
		if (line.length === 0) wrapped.push('');
		for (let start = 0; start < line.length; start += width) {
			wrapped.push(line.slice(start, start + width));
		}
	}
	return wrapped.length ? wrapped : [''];
}

function sanitizeSource(text) {
	const clean = text.replace(/\r/g, '').replace(/\t/g, '  ');
	return clean.trim() ? clean.split('\n') : [];
}

async function loadSource() {
	try {
		const res = await fetch(BUNDLE_URL, { cache: 'no-cache', signal: AbortSignal.timeout(8000) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		sourceLines = sanitizeSource(await res.text());
		if (!sourceLines.length) throw new Error('Empty source');
		sourceLoaded = true;
	} catch {
		sourceLines = ['source offline'];
		sourceLoaded = false;
	}
}

function sourceOffset(lines, previous, index) {
	if (!sourceLoaded || lines.length < 2) return 0;
	const wave = Math.sin((t.frameCount + 1) * 12.9898 + lines.length * 78.233 + index * 37.719) * 43758.5453;
	let offset = Math.floor((wave - Math.floor(wave)) * lines.length);
	if (offset === previous) offset = (offset + Math.ceil(lines.length / 3)) % lines.length;
	return offset;
}

function takeRandom(items) {
	return items.splice(Math.floor(t.random() * items.length), 1)[0];
}

function chooseSourceReveals() {
	const previous = sourceReveals;
	const colors = [...SOURCE_PALETTE];
	const curves = [...REVEAL_CURVES];
	sourceReveals = rectangles
		.filter(({ rule }) => rule === STATIC_RULE)
		.map((rect, index) => {
			const lines = wrapLines(sourceLines, rect.width);
			const offset = sourceOffset(lines, previous[index]?.offset, index);
			return {
				rect,
				offset,
				rows: Array.from({ length: rect.height }, (_, row) =>
					lines[(offset + row) % lines.length].slice(0, rect.width)
				),
				color: takeRandom(colors),
				curve: takeRandom(curves),
			};
		});
}

function renderSeed(progress) {
	const size = framebufferSize();
	renderTo(seedFramebuffer, () => {
		t.image(previousFramebuffer);
		t.printAlign('left', 'top');
		for (const { rect, rows, color, curve } of sourceReveals) {
			const left = cellIndexToCentered(rect.x, size.width);
			const top = cellIndexToCentered(rect.y, size.height);
			const revealed = Math.min(area(rect), Math.max(0, Math.floor(t.ease(curve, progress) * area(rect))));
			t.charColor(color);
			for (let row = 0; row < rect.height; row++) {
				const columns = Math.min(rect.width, Math.max(0, revealed - row * rect.width));
				if (columns && rows[row]) t.print(rows[row].slice(0, columns), left, top + row, { markup: false });
			}
		}
	});
}

function splitRectangle(rect) {
	const vertical = rect.width > 1 && (rect.height === 1 || t.random() < 0.5);
	const length = vertical ? rect.width : rect.height;
	const cut = Math.max(1, Math.min(length - 1, Math.round(length * (0.3 + t.random() * 0.4))));
	return vertical
		? [{ ...rect, width: cut }, { ...rect, x: rect.x + cut, width: length - cut }]
		: [{ ...rect, height: cut }, { ...rect, y: rect.y + cut, height: length - cut }];
}

function createRectangles(cols, rows, seed) {
	t.randomSeed(`meltup-v1:${seed}`);
	const result = [{ x: 0, y: 0, width: cols, height: rows }];
	const count = Math.min(RECTANGLE_COUNT, cols * rows);
	while (result.length < count) {
		const largest = result.reduce((best, rect, index) => (area(rect) > area(result[best]) ? index : best), 0);
		result.push(...splitRectangle(result.splice(largest, 1)[0]));
	}
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(t.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	const sourceRects = new Set([...result].sort((a, b) => area(b) - area(a)).slice(0, SOURCE_RECTANGLE_COUNT));
	return result.map((rect) => ({
		...rect,
		rule: sourceRects.has(rect) ? STATIC_RULE : Math.floor(t.random() * 8),
	}));
}

function startCycle(size) {
	rectangles = createRectangles(size.width, size.height, t.frameCount);
	chooseSourceReveals();
	cycleStartFrame = t.frameCount;
}

function renderTo(framebuffer, draw) {
	framebuffer.begin();
	t.resetShader();
	t.background(0);
	if (draw) draw();
	framebuffer.end();
	t.resetShader();
}

function resetSimulation(size) {
	for (const framebuffer of [seedFramebuffer, previousFramebuffer, nextFramebuffer]) renderTo(framebuffer);
	startCycle(size);
	renderSeed(0);
	renderTo(previousFramebuffer, () => t.image(seedFramebuffer));
}

function createState() {
	const size = framebufferSize();
	[seedFramebuffer, previousFramebuffer, nextFramebuffer] = Array.from({ length: 3 }, () => t.createFramebuffer(size));
	resetSimulation(size);
}

function pushFrame() {
	const size = framebufferSize();
	renderTo(nextFramebuffer, () => {
		t.shader(pushShader);
		t.setUniforms({
			u_gridSize: [size.width, size.height],
			u_frame: t.frameCount,
			u_rectCount: rectangles.length,
			u_rects: rectangles.flatMap((rect) => shaderRectangle(rect, size.height)),
			u_rules: rectangles.map(({ rule }) => rule),
			u_seedCharacter: seedFramebuffer.textures[0],
			u_seedPrimaryColor: seedFramebuffer.textures[1],
			u_seedSecondaryColor: seedFramebuffer.textures[2],
			u_previousCharacter: previousFramebuffer.textures[0],
			u_previousPrimaryColor: previousFramebuffer.textures[1],
			u_previousSecondaryColor: previousFramebuffer.textures[2],
		});
		t.rect(size.width, size.height);
	});
}

t.fontSize(FONT_SIZE);

t.setup(async () => {
	pushShader = await t.createMaterialShader(PUSH_SHADER);
	await loadSource();
	createState();
});

t.draw(() => {
	if (!previousFramebuffer) return;
	const size = framebufferSize();
	const duration = Math.max(size.width, size.height);
	if (t.frameCount - cycleStartFrame >= duration) startCycle(size);
	const progress = duration < 2 ? 1 : Math.min(1, (t.frameCount - cycleStartFrame) / (duration - 1));
	renderSeed(progress);
	pushFrame();
	t.background(0);
	t.image(nextFramebuffer);
	[previousFramebuffer, nextFramebuffer] = [nextFramebuffer, previousFramebuffer];
});

t.windowResized(() => {
	if (!seedFramebuffer) return;
	const size = framebufferSize();
	for (const framebuffer of [seedFramebuffer, previousFramebuffer, nextFramebuffer]) {
		framebuffer.resize(size.width, size.height);
	}
	resetSimulation(size);
});
