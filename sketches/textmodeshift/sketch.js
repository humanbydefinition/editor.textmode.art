const FONT_SIZE = 16;
const RECTANGLE_COUNT = 32;
const PALETTE = [
	'#000000', '#181818', '#282828', '#383838',
	'#474747', '#565656', '#646464', '#717171',
	'#7e7e7e', '#8c8c8c', '#9b9b9b', '#ababab',
	'#bdbdbd', '#d1d1d1', '#e7e7e7', '#ffffff',
];

const SEED_SHADER = `#version 300 es
precision highp float;
uniform vec2 u_gridSize;
uniform float u_frame;
uniform vec2 u_glyphs[256];
uniform int u_glyphCount;
uniform vec3 u_palette[16];
layout(location = 0) out vec4 o_character;
layout(location = 1) out vec4 o_primaryColor;
layout(location = 2) out vec4 o_secondaryColor;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
	vec2 cell = floor(gl_FragCoord.xy);
	float a = hash(cell + u_frame * vec2(0.17, 0.31));
	float b = hash(cell.yx + u_frame * vec2(0.43, 0.11));
	int glyph = min(u_glyphCount - 1, int(a * float(u_glyphCount)));
	o_character = vec4(u_glyphs[glyph], 0.0, 1.0);
	o_primaryColor = vec4(u_palette[min(15, int(b * 16.0))], 1.0);
	o_secondaryColor = vec4(u_palette[min(15, int(fract(a + b) * 16.0))], 1.0);
}`;

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
	bool pinned = cell.x == 0 || cell.y == 0 || cell.x == size.x - 1 || cell.y == size.y - 1;
	ivec2 movement = random(vec2(cell)) < 0.15 ? ivec2(0) : DIRECTIONS[rule];
	ivec2 source = pinned ? cell : clamp(cell - movement, ivec2(0), size - 1);
	o_character = sampleState(u_previousCharacter, u_seedCharacter, source, pinned);
	o_primaryColor = sampleState(u_previousPrimaryColor, u_seedPrimaryColor, source, pinned);
	o_secondaryColor = sampleState(u_previousSecondaryColor, u_seedSecondaryColor, source, pinned);
}`;

let seedShader, pushShader, seedFramebuffer, previousFramebuffer, nextFramebuffer;
let glyphs, glyphCount, palette, rectangles;

const framebufferSize = () => ({ width: t.grid.cols + 2, height: t.grid.rows + 2 });
const area = ({ width, height }) => width * height;

function splitRectangle(rect) {
	const vertical = rect.width > 1 && (rect.height === 1 || t.random() < 0.5);
	const length = vertical ? rect.width : rect.height;
	const cut = Math.max(1, Math.min(length - 1, Math.round(length * (0.3 + t.random() * 0.4))));
	return vertical
		? [{ ...rect, width: cut }, { ...rect, x: rect.x + cut, width: length - cut }]
		: [{ ...rect, height: cut }, { ...rect, y: rect.y + cut, height: length - cut }];
}

function createRectangles(cols, rows, seed) {
	t.randomSeed(`textmodeshift-v1:${seed}`);
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
	return result.map((rect) => ({ ...rect, rule: Math.floor(t.random() * 8) }));
}

function renderTo(framebuffer, draw) {
	framebuffer.begin();
	t.resetShader();
	t.background(0);
	if (draw) draw();
	framebuffer.end();
	t.resetShader();
}

function renderSeed(frame) {
	const size = framebufferSize();
	renderTo(seedFramebuffer, () => {
		t.shader(seedShader);
		t.setUniforms({
			u_gridSize: [size.width, size.height],
			u_frame: frame,
			u_glyphs: glyphs,
			u_glyphCount: glyphCount,
			u_palette: palette,
		});
		t.rect(size.width, size.height);
	});
}

function startCycle(size) {
	rectangles = createRectangles(size.width, size.height, t.frameCount);
	renderSeed(t.frameCount);
}

function resetSimulation(size) {
	for (const framebuffer of [seedFramebuffer, previousFramebuffer, nextFramebuffer]) renderTo(framebuffer);
	startCycle(size);
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
			u_rects: rectangles.flatMap(({ x, y, width, height }) => [x, y, width, height]),
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
	glyphs = t.font.characters.flatMap((glyph) => glyph.color.slice(0, 2));
	glyphCount = t.font.characters.length;
	palette = PALETTE.flatMap((color) => t.color(color).normalized.slice(0, 3));
	[seedShader, pushShader] = await Promise.all([
		t.createMaterialShader(SEED_SHADER),
		t.createMaterialShader(PUSH_SHADER),
	]);
	createState();
});

t.draw(() => {
	if (!previousFramebuffer) return;
	if (t.frameCount % Math.max(t.grid.cols, t.grid.rows) === 0) startCycle(framebufferSize());
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
