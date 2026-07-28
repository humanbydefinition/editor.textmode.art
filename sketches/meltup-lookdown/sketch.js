const RECTANGLE_COUNT = 24;
const SOURCE_RECTANGLE_COUNT = 4;
const STATIC_RULE = 8;

const BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/textmode.js@0.17.0/dist/textmode.umd.js';

const SOURCE_PALETTE = [
	'#ffffff',
	'#6df7c1',
	'#11adc1',
	'#606c81',
	'#393457',
	'#1e8875',
	'#5bb361',
	'#a1e55a',
	'#f7e476',
	'#f99252',
	'#cb4d68',
	'#6a3771',
	'#c92464',
	'#f48cb6',
	'#f7b69e',
	'#9b9c82',
];

const SOURCE_REVEAL_CURVES = [
	'inQuad',
	'outQuad',
	'inOutQuad',
	'inCubic',
	'outCubic',
	'inOutCubic',
	'inSine',
	'outSine',
	'inOutSine',
];

const PUSH_SHADER = `#version 300 es
precision highp float;
uniform vec2 u_gridSize;
uniform float u_frame;
uniform int u_rectCount;
uniform vec4 u_rects[64];
uniform int u_rules[64];
uniform sampler2D u_seedCharacter;
uniform sampler2D u_seedPrimaryColor;
uniform sampler2D u_seedSecondaryColor;
uniform sampler2D u_previousCharacter;
uniform sampler2D u_previousPrimaryColor;
uniform sampler2D u_previousSecondaryColor;
layout(location = 0) out vec4 o_character;
layout(location = 1) out vec4 o_primaryColor;
layout(location = 2) out vec4 o_secondaryColor;

bool inside(vec2 cell, vec4 rect) {
	return all(greaterThanEqual(cell, rect.xy)) && all(lessThan(cell, rect.xy + rect.zw));
}

float random(vec2 cell) {
	return fract(sin(dot(cell, vec2(127.1, 311.7)) + u_frame * 0.001) * 43758.5453);
}

ivec2 direction(int rule) {
	if (rule == 0) return ivec2(-1,  1);
	if (rule == 1) return ivec2( 0,  1);
	if (rule == 2) return ivec2( 1,  1);
	if (rule == 3) return ivec2(-1,  0);
	if (rule == 4) return ivec2( 1,  0);
	if (rule == 5) return ivec2(-1, -1);
	if (rule == 6) return ivec2( 0, -1);
	return ivec2(1, -1);
}

vec4 sampleState(sampler2D history, sampler2D seed, ivec2 cell, bool inject) {
	return inject ? texelFetch(seed, cell, 0) : texelFetch(history, cell, 0);
}

int ruleAtCell(ivec2 cell) {
	int rule = 0;
	for (int i = 0; i < u_rectCount; i++) {
		if (inside(vec2(cell), u_rects[i])) rule = u_rules[i];
	}
	return rule;
}

void main() {
	ivec2 cell = ivec2(gl_FragCoord.xy);
	ivec2 size = ivec2(u_gridSize);
	int rule = ruleAtCell(cell);
	bool pinned = rule == 8;
	ivec2 movement = pinned ? ivec2(0) : (random(vec2(cell)) < 0.15 ? ivec2(0) : direction(rule));
	ivec2 source = (cell - movement + size) % size;
	ivec2 selected = pinned ? cell : source;
	o_character = sampleState(u_previousCharacter, u_seedCharacter, selected, pinned);
	o_primaryColor = sampleState(u_previousPrimaryColor, u_seedPrimaryColor, selected, pinned);
	o_secondaryColor = sampleState(u_previousSecondaryColor, u_seedSecondaryColor, selected, pinned);
}`;

let sourceLines = [];
let sourceLoaded = false;
let sourceReveals = [];
let cycleStartFrame = 0;

let pushShader;
let seedFramebuffer;
let previousFramebuffer;
let nextFramebuffer;
let rectangles;

function framebufferSize() {
	return { width: t.grid.cols, height: t.grid.rows };
}

function cellIndexToCentered(index, dimension) {
	return index - (dimension - 1) / 2;
}

function shaderRectangle(rect, framebufferHeight) {
	return [rect.x, framebufferHeight - rect.y - rect.height, rect.width, rect.height];
}

function rectangleUniforms() {
	const { height: framebufferHeight } = framebufferSize();
	return rectangles.flatMap((rect) => shaderRectangle(rect, framebufferHeight));
}

function ruleUniforms() {
	return rectangles.map(({ rule }) => rule);
}

function wrapLines(lines, width) {
	if (width < 1) return [];
	const out = [];
	for (let i = 0; i < lines.length; i++) {
		const line = String(lines[i]);
		if (line.length === 0) {
			out.push('');
			continue;
		}
		if (line.length <= width) {
			out.push(line);
			continue;
		}
		let start = 0;
		while (start < line.length) {
			out.push(line.slice(start, start + width));
			start += width;
		}
	}
	return out.length > 0 ? out : [''];
}

function sourceRows(lines, offset, rect) {
	return Array.from({ length: rect.height }, (_, row) => lines[(offset + row) % lines.length].slice(0, rect.width));
}

function chooseSourceSlice(lines, previousOffset, index) {
	if (lines.length < 2) return 0;
	const wave = Math.sin((t.frameCount + 1) * 12.9898 + lines.length * 78.233 + index * 37.719) * 43758.5453;
	let offset = Math.floor((wave - Math.floor(wave)) * lines.length);
	if (offset === previousOffset) offset = (offset + Math.ceil(lines.length / 3)) % lines.length;
	return offset;
}

function takeRandom(available, choices) {
	if (available.length === 0) available.push(...choices);
	return available.splice(Math.floor(t.random() * available.length), 1)[0];
}

function chooseSourceReveals(sourceRectangles) {
	const previousReveals = sourceReveals;
	const availableColors = [...SOURCE_PALETTE];
	const availableCurves = [...SOURCE_REVEAL_CURVES];
	sourceReveals = sourceRectangles.map((rect, index) => {
		const lines = wrapLines(sourceLines, rect.width);
		const offset = sourceLoaded ? chooseSourceSlice(lines, previousReveals[index]?.offset, index) : 0;
		return {
			rect,
			rows: sourceRows(lines, offset, rect),
			offset,
			color: takeRandom(availableColors, SOURCE_PALETTE),
			curve: takeRandom(availableCurves, SOURCE_REVEAL_CURVES),
		};
	});
}

function cycleDuration(size) {
	return Math.max(size.width, size.height);
}

function revealProgress(size) {
	const duration = cycleDuration(size);
	if (duration < 2) return 1;
	return Math.min(1, Math.max(0, (t.frameCount - cycleStartFrame) / (duration - 1)));
}

function renderSeed(progress) {
	const size = framebufferSize();

	seedFramebuffer.begin();
	t.resetShader();
	t.background(0);
	t.image(previousFramebuffer);

	if (sourceReveals.length === 0) {
		seedFramebuffer.end();
		return;
	}

	// Source rectangles layer their reveal over the current simulation state.
	t.printAlign('left', 'top');
	for (const source of sourceReveals) {
		const { rect, rows, color, curve } = source;
		const left = cellIndexToCentered(rect.x, size.width);
		const top = cellIndexToCentered(rect.y, size.height);
		t.charColor(color);
		const area = rect.width * rect.height;
		const revealedCells = Math.min(area, Math.max(0, Math.floor(t.ease(curve, progress) * area)));
		for (let row = 0; row < rect.height; row++) {
			const visibleColumns = Math.min(rect.width, Math.max(0, revealedCells - row * rect.width));
			if (visibleColumns === 0) continue;
			const item = rows[row];
			if (item) t.print(item.slice(0, visibleColumns), left, top + row, { markup: false });
		}
	}

	seedFramebuffer.end();
}

function sanitizeSource(text) {
	const normalized = text.replace(/\r/g, '').replace(/\t/g, '  ');
	if (normalized.trim().length === 0) return [];
	return normalized.split('\n');
}

async function loadSource() {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);
	try {
		const res = await fetch(BUNDLE_URL, { cache: 'no-cache', signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const loadedLines = sanitizeSource(await res.text());
		if (loadedLines.length === 0) throw new Error('Empty source');
		sourceLines = loadedLines;
		sourceLoaded = true;
	} catch {
		sourceLines = ['source offline'];
		sourceLoaded = false;
	} finally {
		clearTimeout(timer);
	}
}

function createRectangles(cols, rows, seed) {
	t.randomSeed(`meltup-v1:${seed}`);
	const targetCount = Math.min(RECTANGLE_COUNT, cols * rows);
	const rectangles = [{ x: 0, y: 0, width: cols, height: rows }];
	while (rectangles.length < targetCount) {
		let largest = -1;
		for (let i = 0; i < rectangles.length; i++) {
			if (rectangles[i].width * rectangles[i].height <= 1) continue;
			if (
				largest === -1 ||
				rectangles[i].width * rectangles[i].height > rectangles[largest].width * rectangles[largest].height
			) {
				largest = i;
			}
		}
		if (largest === -1) break;
		const rect = rectangles.splice(largest, 1)[0];
		rectangles.push(...splitRectangle(rect));
	}
	for (let i = rectangles.length - 1; i > 0; i--) {
		const j = Math.floor(t.random() * (i + 1));
		[rectangles[i], rectangles[j]] = [rectangles[j], rectangles[i]];
	}
	const sourceIndices = new Set(
		rectangles
			.map((rect, index) => ({ index, area: rect.width * rect.height }))
			.sort((a, b) => b.area - a.area)
			.slice(0, Math.min(SOURCE_RECTANGLE_COUNT, rectangles.length))
			.map(({ index }) => index)
	);
	return rectangles.map((rect, i) => ({
		...rect,
		rule: sourceIndices.has(i) ? STATIC_RULE : Math.floor(t.random() * 8),
	}));
}

function splitRectangle(rect) {
	const canSplitVertically = rect.width > 1;
	const canSplitHorizontally = rect.height > 1;
	const vertical = canSplitVertically && (!canSplitHorizontally || t.random() < 0.5);
	const length = vertical ? rect.width : rect.height;
	const cut = Math.max(1, Math.min(length - 1, Math.round(length * (0.3 + t.random() * 0.4))));
	return vertical
		? [
				{ ...rect, width: cut },
				{ ...rect, x: rect.x + cut, width: length - cut },
			]
		: [
				{ ...rect, height: cut },
				{ ...rect, y: rect.y + cut, height: length - cut },
			];
}

function createState() {
	const size = framebufferSize();
	seedFramebuffer = t.createFramebuffer(size);
	previousFramebuffer = t.createFramebuffer(size);
	nextFramebuffer = t.createFramebuffer(size);
	resetSimulation(size);
}

function clearFramebuffer(framebuffer) {
	framebuffer.begin();
	t.resetShader();
	t.background(0);
	framebuffer.end();
}

function copyFramebuffer(source, target) {
	target.begin();
	t.resetShader();
	t.background(0);
	t.image(source);
	target.end();
}

function resetSimulation(size) {
	for (const framebuffer of [seedFramebuffer, previousFramebuffer, nextFramebuffer]) {
		clearFramebuffer(framebuffer);
	}
	startCycle(size);
	renderSeed(0);
	copyFramebuffer(seedFramebuffer, previousFramebuffer);
}

function startCycle(size) {
	rectangles = createRectangles(size.width, size.height, t.frameCount);
	chooseSourceReveals(rectangles.filter((r) => r.rule === STATIC_RULE));
	cycleStartFrame = t.frameCount;
}

function pushFrame() {
	const size = framebufferSize();
	nextFramebuffer.begin();
	t.background(0);
	t.shader(pushShader);
	t.setUniform('u_gridSize', [size.width, size.height]);
	t.setUniform('u_frame', t.frameCount);
	t.setUniform('u_rectCount', rectangles.length);
	t.setUniform('u_rects', rectangleUniforms());
	t.setUniform('u_rules', ruleUniforms());
	t.setUniform('u_seedCharacter', seedFramebuffer.textures[0]);
	t.setUniform('u_seedPrimaryColor', seedFramebuffer.textures[1]);
	t.setUniform('u_seedSecondaryColor', seedFramebuffer.textures[2]);
	t.setUniform('u_previousCharacter', previousFramebuffer.textures[0]);
	t.setUniform('u_previousPrimaryColor', previousFramebuffer.textures[1]);
	t.setUniform('u_previousSecondaryColor', previousFramebuffer.textures[2]);
	t.rect(size.width, size.height);
	nextFramebuffer.end();
	t.resetShader();
}

t.fontSize(16);

t.setup(async () => {
	pushShader = await t.createMaterialShader(PUSH_SHADER);
	await loadSource();
	createState();
});

t.draw(() => {
	if (!previousFramebuffer) return;
	const size = framebufferSize();
	if (t.frameCount - cycleStartFrame >= cycleDuration(size)) startCycle(size);
	renderSeed(revealProgress(size));
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
