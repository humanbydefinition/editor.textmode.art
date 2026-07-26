const WORLD_SIZE = 256;
const STATE_COUNT = 16;

const PALETTE = [
	'#212b5e',
	'#636fb2',
	'#adc4ff',
	'#ffffff',
	'#ffccd7',
	'#ff7fbd',
	'#872450',
	'#e52d40',
	'#ef604a',
	'#ffd877',
	'#00cc8b',
	'#005a75',
	'#513ae8',
	'#19baff',
	'#7731a5',
	'#b97cff',
];

const AUTOMATA_SHADER = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_previousState;
uniform int u_generation;
uniform float u_seed;
uniform int u_stateCount;
layout(location = 0) out vec4 o_state;

float hash(vec2 value) {
	return fract(sin(dot(value, vec2(12.9898, 78.233)) + u_seed * 437.1) * 43758.5453);
}

ivec2 wrapCell(ivec2 cell) {
	ivec2 size = textureSize(u_previousState, 0);
	return ivec2(mod(vec2(cell + size), vec2(size)));
}

vec4 stateAt(ivec2 cell) {
	return texelFetch(u_previousState, wrapCell(cell), 0);
}

void sortValues(inout float values[6]) {
	for (int i = 1; i < 6; i++) {
		float value = values[i];
		int j = i - 1;
		while (j >= 0 && values[j] > value) {
			values[j + 1] = values[j];
			j--;
		}
		values[j + 1] = value;
	}
}

void main() {
	ivec2 cell = ivec2(gl_FragCoord.xy);
	if (u_generation == 0) {
		float value = floor(hash(vec2(cell)) * float(u_stateCount)) / 255.0;
		o_state = vec4(value, 0.0, 0.0, 1.0);
		return;
	}

	vec4 current = stateAt(cell);
	vec2 size = vec2(textureSize(u_previousState, 0));
	ivec2 impulse = ivec2(hash(vec2(u_generation, 1.7)) * size.x, hash(vec2(2.3, u_generation)) * size.y);
	if (all(equal(cell, impulse)) && current.b == 0.0) {
		o_state = vec4(current.r, 0.0, 1.0 / 255.0, 1.0);
		return;
	}

	float values[6] = float[](
		stateAt(cell + ivec2(-1, 0)).r,
		stateAt(cell + ivec2(1, 0)).r,
		stateAt(cell + ivec2(0, -1)).r,
		stateAt(cell + ivec2(0, 1)).r,
		current.r,
		current.r
	);
	sortValues(values);
	int selected = (int(values[0] * 255.0) + int(values[5] * 255.0)) % 6;
	float nextValue = values[selected];

	ivec2 neighbors[8] = ivec2[](
		ivec2(-1, 0), ivec2(1, 0), ivec2(0, -1), ivec2(0, 1),
		ivec2(-1, -1), ivec2(1, -1), ivec2(-1, 1), ivec2(1, 1)
	);
	float maxTrail = 0.0;
	for (int i = 0; i < 8; i++) {
		vec4 neighbor = stateAt(cell + neighbors[i]);
		if (neighbor.r == current.r) maxTrail = max(maxTrail, neighbor.b);
	}

	float nextTrail = current.b;
	if (nextValue == current.r && maxTrail > 0.0 && current.b == 0.0) {
		nextTrail = (mod(floor(maxTrail * 255.0), 255.0) + 1.0) / 255.0;
	} else if (nextValue != current.r) {
		nextTrail = current.b > 0.5 / 255.0 && current.b < 1.5 / 255.0 ? 1.0 / 255.0 : 0.0;
	}
	o_state = vec4(nextValue, 0.0, nextTrail, 1.0);
}`;

const DISPLAY_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform int u_stateCount;
uniform vec2 u_glyphs[256];
uniform vec3 u_primaryColors[256];
uniform vec3 u_secondaryColors[256];
layout(location = 0) out vec4 o_character;
layout(location = 1) out vec4 o_primaryColor;
layout(location = 2) out vec4 o_secondaryColor;

void main() {
	vec2 size = vec2(textureSize(u_state, 0));
	ivec2 source = ivec2(mod(gl_FragCoord.xy, size));
	vec4 state = texelFetch(u_state, source, 0);
	int stateVal = int(mod(floor(state.r * 255.0 + 0.5), float(u_stateCount)));
	o_character = vec4(u_glyphs[stateVal], 0.0, 1.0);
	o_primaryColor = vec4(u_primaryColors[stateVal], 1.0);
	o_secondaryColor = vec4(u_secondaryColors[stateVal], 1.0);
}`;

let automataShader;
let displayShader;
let previousState;
let nextState;
let generation;
let seed;
let glyphs;
let primaryColors;
let secondaryColors;

function renderState(target, source, stateGeneration) {
	target.begin();
	t.background(0);
	t.shader(automataShader);
	t.setUniform('u_previousState', source.textures[0]);
	t.setUniform('u_generation', stateGeneration);
	t.setUniform('u_seed', seed);
	t.setUniform('u_stateCount', STATE_COUNT);
	t.rect(WORLD_SIZE, WORLD_SIZE);
	target.end();
}

function stepAutomata() {
	renderState(nextState, previousState, generation);
	[previousState, nextState] = [nextState, previousState];
	generation++;
}

t.fontSize(16);

t.setup(async () => {
	t.randomSeed('textmodemata-v1');
	seed = t.random();

	const normalizedPalette = PALETTE.map((color) => t.color(color).normalized.slice(0, 3));
	const availableGlyphs = t.font.characters;

	const selectedGlyphs = [];
	const primaryList = [];
	const secondaryList = [];

	for (let i = 0; i < STATE_COUNT; i++) {
		const glyphIndex = Math.floor(t.random() * availableGlyphs.length);
		selectedGlyphs.push(availableGlyphs[glyphIndex]);

		const charColorIndex = Math.floor(t.random() * normalizedPalette.length);
		let cellColorIndex = Math.floor(t.random() * (normalizedPalette.length - 1));
		if (cellColorIndex >= charColorIndex) {
			cellColorIndex++;
		}

		primaryList.push(...normalizedPalette[charColorIndex]);
		secondaryList.push(...normalizedPalette[cellColorIndex]);
	}

	glyphs = selectedGlyphs.flatMap((glyph) => glyph.color.slice(0, 2));
	primaryColors = primaryList;
	secondaryColors = secondaryList;

	[automataShader, displayShader] = await Promise.all([
		t.createMaterialShader(AUTOMATA_SHADER),
		t.createMaterialShader(DISPLAY_SHADER),
	]);
	previousState = t.createFramebuffer({ width: WORLD_SIZE, height: WORLD_SIZE, attachments: 1 });
	nextState = t.createFramebuffer({ width: WORLD_SIZE, height: WORLD_SIZE, attachments: 1 });
	renderState(previousState, nextState, 0);
	generation = 1;
});

t.draw(() => {
	if (!previousState) return;
	stepAutomata();
	t.background(0);
	t.shader(displayShader);
	t.setUniform('u_state', previousState.textures[0]);
	t.setUniform('u_stateCount', STATE_COUNT);
	t.setUniform('u_glyphs', glyphs);
	t.setUniform('u_primaryColors', primaryColors);
	t.setUniform('u_secondaryColors', secondaryColors);
	t.rect(t.grid.cols, t.grid.rows);
});
