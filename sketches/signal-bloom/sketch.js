/**
 * @title Signal Bloom
 * @author humanbydefinition
 * @description A small repository-backed gallery sketch for synth.textmode.art.
 */

t.fontSize(16);
t.bpm(72);

const time = () => t.secs;

const carrier = osc(9, -0.08, 0.45)
  .kaleid(6)
  .rotate(() => time() * 0.08)
  .modulate(noise(3, 0.05), 0.16);

const glyphs = carrier
  .pixelate(42, 24)
  .contrast(1.45)
  .posterize(9);

const ink = gradient(0.04)
  .hue(() => time() * 0.05)
  .saturate(1.2)
  .contrast(1.1);

const cells = osc(18, 0.04, 0.15)
  .rotate(1.5708)
  .modulateScrollY(noise(2, 0.06), 0.25, 0.04)
  .colorama(0.18)
  .brightness(-0.28);

t.layers.base.synth(
  char(glyphs)
    .charMap(" .:-=+*#%@")
    .charColor(ink)
    .cellColor(cells)
);

const bloom = t.layers.add({
  blendMode: "screen",
  opacity: 0.55,
  fontSize: 24,
});

bloom.synth(
  char(shape(5, 0.28, 0.03)
    .repeat(3, 2)
    .scrollX(() => Math.sin(time() * 0.18) * 0.08)
    .scrollY(() => Math.cos(time() * 0.16) * 0.08))
    .charMap("  .oO@")
    .charColor(osc(4, 0.02, 0.7).colorama(0.35))
    .cellColor(solid(0, 0, 0, 0))
);

bloom.draw(() => {
  bloom.rotateZ(Math.sin(time() * 0.25) * 10);
  bloom.opacity(0.42 + Math.sin(time() * 0.7) * 0.12);
});
