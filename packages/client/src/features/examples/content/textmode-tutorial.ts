import type { Example } from '@/features/examples/types';

export const tutorials: Example[] = [
    {
        id: 'tutorial-1',
        name: 'tutorial #1',
        description: 'introduction to synth.textmode.art',
        category: 'tutorial',
        code: `/**
 * Welcome to \`synth.textmode.art\`!
 * 
 * At its core, this environment works just like standard \`hydra-synth\`.
 * You can throw in your favorite hydra sketches into the \`synth\` method below
 * with minimal changes.
 *
 * However, unlike pixel-based libraries, \`textmode.js\` is driven by 3 parallel textures 
 * that determine the grid: glyphs, glyph colors, and cell colors.
 * 
 * Because cycling through ASCII characters at the same speed as colors can look chaotic,
 * we provide specific channels to control each texture independently:
 * 
 * - \`char(src)\`: Controls ONLY the glyphs.
 * - \`charColor(src)\`: Controls ONLY the glyph colors.
 * - \`cellColor(src)\`: Controls ONLY the background cell colors.
 * - \`paint(src)\`: Sets both glyph and cell colors (great for pixel art!).
 * 
 * In this first example, we use a global source which drives both glyphs and colors
 * simultaneously, keeping the background black.
 *
 * Try it out! 
 * 1. Wrap \`noise()\` in \`paint()\` for instant pixel art.
 * 2. Set \`fontSize(1)\` to recreate standard hydra visuals.
 * 3. Wrap \`noise()\` in \`char()\` instead with a reasonable font size to see pure ASCII structure.
 * 
 * Ready for more? In the next tutorial, we'll explore how to use these channels 
 * together to create complex, layered textmode compositions.
 */

t.fontSize(16);

t.layers.base.synth(
  noise()
);`,
    },
    {
        id: 'tutorial-2',
        name: 'tutorial #2',
        description: 'layering channels & composition',
        category: 'tutorial',
        code: `/**
 * @title synth.textmode.art - tutorial #2
 * @author humanbydefinition - https://github.com/humanbydefinition
 */

/**
 * Welcome to Tutorial #2!
 *
 * In the previous tutorial, we learned about the 3 distinct channels:
 * - \`char(src)\`: Controls ONLY the glyphs.
 * - \`charColor(src)\`: Controls ONLY the glyph colors.
 * - \`cellColor(src)\`: Controls ONLY the background cell colors.
 *
 * The real power of \`synth.textmode.art\` comes from driving these 3 textures with DIFFERENT sources.
 *
 * In this example:
 * 1. We use \`voronoi\` to drive the characters. The brightness of the pattern selects the character index.
 * 2. We use a \`gradient\` to drive the character colors, creating a smooth wash over the characters.
 * 3. We use a slow \`osc\` to drive the background cell colors, creating a pulsing backlight.
 *
 * By separating these, we get a complex composition where movement in one layer doesn't necessarily mean movement in another.
 * The characters can dance frantically while the colors shift slowly!
 *
 * Try modifying just one of the channels below to see how it affects the whole.
 * For example, try removing \`.charColor(colors)\` to see the default white characters against the pulsing background.
 *
 * In the next tutorial, we'll see how we can control WHICH characters are actually rendered.
 */

// 1. Define a source for the characters
const characters = voronoi(8, 0.3)
  .rotate(() => t.secs * 0.2);

// 2. Define a source for the colors
const colors = gradient()
  .scrollX(0.5)
  .colorama(0.5);

// 3. Define a source for the background
const background = osc(10, 0.1, 0.5)
  .rotate(1.57)
  .modulate(noise(3, 0.1), 0.5);

t.layers.base.synth(
  char(characters)
    .charColor(colors)
    .cellColor(background)
);`,
    },
    {
        id: 'tutorial-3',
        name: 'tutorial #3',
        description: 'custom character maps',
        category: 'tutorial',
        code: `/**
 * @title synth.textmode.art - tutorial #3
 * @author humanbydefinition - https://github.com/humanbydefinition
 */

/**
 * Welcome to Tutorial #3!
 *
 * So far, we've focused on changing *pixel* values (colors, brightness).
 * But this is ASCII art! We want to control the specialized characters themselves.
 *
 * By default, all characters in the selected font are used.
 * 
 * We can change this by using the \`.charMap()\` method, 
 * which defines the pool of available characters.
 *
 * In this example:
 * - We start with a \`charMap\` of binary digits "01".
 * - The source brightness is then mapped to indices 0 ('0') and 1 ('1').
 *
 * This allows for precise control. By changing the \`charMap\` to "/\\\\",
 * we could create mazes or geometric patterns!
 *
 * Try changing the charMap string below to " ." to see a simple dot matrix,
 * or increase the charCount to include more variety if you provide a longer string.
 */

// A simple scrolling noise texture
const matrixData = noise(4, 0.2)
  .pixelate(30)
  .scrollY(1, 0.2);

// Bright green matrix colors
const matrixColor = solid(0, 1, 0)
  .mult(noise());

t.layers.base.synth(
  char(matrixData)
    .charMap('01')               // Define our alphabet as just '0' and '1'
    .charColor(matrixColor)      // Color them green
);`,
    },
    {
        id: 'tutorial-4',
        name: 'tutorial #4',
        description: 'layering system & composition',
        category: 'tutorial',
        code: `/**
 * @title synth.textmode.art - tutorial #4
 * @author humanbydefinition - https://github.com/humanbydefinition
 */

/**
 * Welcome to Tutorial #5!
 *
 * In this tutorial, we'll explore the layering system.
 * Layers let you stack multiple synths on top of each other,
 * each with its own blend mode, position, rotation, opacity, and font size.
 *
 * Key layer methods:
 * - \`t.layers.add({ options })\` - Create a new layer
 * - \`layer.synth(src)\` - Define a synth for the layer
 * - \`layer.blendMode(mode)\` - Set how the layer blends with layers below
 * - \`layer.offset(x, y)\` - Reposition the layer in pixels
 * - \`layer.rotateZ(degrees)\` - Rotate the layer around its center
 * - \`layer.opacity(value)\` - Set transparency (0-1)
 * - \`layer.draw(callback)\` - Draw using the textmode.js API
 *
 * Available blend modes:
 * 'normal', 'additive', 'multiply', 'screen', 'difference', 
 * 'overlay', 'softLight', 'hardLight', 'colorDodge', 'colorBurn', etc.
 *
 * In this example:
 * 1. The BASE layer renders a kaleidoscopic oscillator as the background.
 * 2. A second layer uses 'screen' blend mode with a voronoi pattern.
 * 3. A third layer uses 'difference' blend, rotating over time.
 * 4. A fourth layer uses the textmode.js drawing API to render custom shapes.
 *
 * Try changing the blend modes, rotation speeds, or offsets to see how they interact!
 */

// === BASE LAYER ===
// The base layer is always at the bottom of the stack
t.layers.base.synth(
  char(osc(10, 0.1, 0.5).kaleid(6))
    .charColor(gradient().hue(() => t.secs * 0.1))
    .cellColor(solid(0.05, 0.05, 0.1))
    .charMap("░▒▓█")
);

// === LAYER 2: Screen Blend with Voronoi ===
const layer2 = t.layers.add({ blendMode: 'screen', opacity: 0.7 });
layer2.synth(
  char(voronoi(12, 0.2))
    .charColor(osc(5, 0.1).colorama(0.3))
    .cellColor(solid(0, 0, 0, 0)) // Transparent background
    .charMap("○●◐◑")
);

// Animate the offset in a circular path
layer2.draw(() => {
  const time = t.secs;
  const radius = 50;
  layer2.offset(
    Math.sin(time * 0.5) * radius,
    Math.cos(time * 0.5) * radius
  );
});

// === LAYER 3: Difference Blend with Rotation ===
const layer3 = t.layers.add({ blendMode: 'difference', opacity: 0.6 });
layer3.synth(
  char(noise(2, 0.1).pixelate(20))
    .charColor(solid(1, 0.5, 0))
    .cellColor(solid(0, 0, 0, 0))
    .charMap("╱╲╳")
);

// Rotate the layer continuously
layer3.draw(() => {
  layer3.rotateZ(t.secs * 15); // 15 degrees per second
});

// === LAYER 4: Custom Drawing with textmode.js API ===
const layer4 = t.layers.add({ fontSize: 32, blendMode: 'additive', opacity: 0.8 });

layer4.draw(() => {
  t.clear(); // Clear this layer each frame
  
  const time = t.secs;
  const cols = t.grid.cols;
  const rows = t.grid.rows;
  
  // Draw animated circles using the textmode.js drawing API
  for (let i = 0; i < 5; i++) {
    const angle = (time + i * 0.5) * 1.2;
    const distance = 4 + Math.sin(time * 2 + i) * 2;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    
    // Set drawing properties
    t.char('○');
    t.charColor(
      Math.sin(time + i) * 127 + 128, 
      Math.sin(time + i + 2) * 127 + 128, 
      Math.sin(time + i + 4) * 127 + 128
    );
    t.cellColor(0, 0, 0, 0);
    
    // Draw a point at the position
    t.translate(x, y);
    t.point();
    t.translate(-x, -y);
  }
  
  // Add subtle rotation to the whole layer
  layer4.rotateZ(Math.sin(time * 0.3) * 10);
});`,
    },
];
