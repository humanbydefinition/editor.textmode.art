# Audio-Reactive Example Sketches

Recovered from git history — before the Strudel integration was removed. These sketches were part of the textmode tutorial series and the gallery.

---

## Tutorial #4 — Audio Reactivity

*Source: `packages/client/src/features/examples/content/textmode-tutorial.ts` (removed in commit `8a293d1`)*

```javascript
/**
 * @title synth.textmode.art - tutorial #4
 * @author humanbydefinition - https://github.com/humanbydefinition
 */

/**
 * Welcome to Tutorial #4!
 *
 * In this tutorial, we'll explore audio reactivity.
 * This is where the magic happens when audio analysis data is available to the runtime.
 *
 * If your setup provides analyzed audio input, the `audio` global lets you drive
 * visuals from the incoming signal.
 *
 * The `audio` global gives you access to the sound analysis:
 *
 * Frequency bands (values between 0 and 1):
 * - `audio.bass()`: Low frequencies (kicks, basslines).
 * - `audio.mid()`: Mid frequencies (vocals, synths).
 * - `audio.high()`: High frequencies (hi-hats, sparkly sounds).
 * - `audio.volume()`: Total loudness / amplitude.
 *
 * Raw analysis data (Uint8Array):
 * - `audio.fft()`: Raw frequency domain data (spectrum).
 * - `audio.waveform()`: Raw time domain data (oscilloscope).
 *
 * In this sketch:
 * 1. We start with a fast `osc` pattern.
 * 2. We `kaleid` (kaleidoscope) it, using `audio.bass()` to change the number of segments dynamically!
 * 3. We use `modulate` with `voronoi` to create organic distortion, driven by `audio.mid()`.
 * 4. Colors are shifted by `audio.high()`.
 *
 * Try changing the incoming audio source and watch the visuals react!
 */

// 1. Create a base geometric oscillation
const geometry = osc(20, 0.05, 0.8)
  .kaleid(() => 3 + audio.bass() * 5)  // Bass controls symmetry
  .rotate(0.5, 0.2);

// 2. Add organic distortion / liquid movement
// Mid frequencies make it "wobble" with more intensity
const fluid = geometry
  .modulate(
     voronoi(10, 0.2, 0.5),
     () => 0.2 + audio.mid() * 0.5
  )
  .scale(() => 1 - audio.volume() * 0.2); // Pump effect

// 3. Dynamic Coloring
const colors = gradient(1)
  .hue(() => audio.high())         // Highs shift color
  .saturate(2)
  .brightness(() => 0.5 + audio.bass()); // Bass flashes brightness

t.layers.base.synth(
  char(fluid)
    .charColor(colors)
    .cellColor(fluid.clone().invert().mult(gradient(), 0.2))
    .charMap("@#%*+=-:. ")
);
```

---

## Signal Bloom

*Source: `sketches/signal-bloom/sketch.js` (removed in commit `252f6fb`)*

A compact gallery sketch layering pulsing glyph bands, soft color drift, and a rotating bloom halo. Not strictly audio-reactive in its original form, but easily adapted to use `audio.bass()` / `audio.volume()` for the rotation speed, opacity, and scale parameters.

```javascript
/**
 * @title Signal Bloom
 * @author humanbydefinition
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
```

---

## Audio-Reactive Adaptations (bonus)

These sketches are not from git history — they are new sketches designed for the current audio input system (`AudioInputService` → runner `audio` global) to validate end-to-end audio reactivity. Use them with the EP-133 K.O. II (or any USB audio input) via the System Menu → Audio tab.

### FFT Spectrum Bars

```javascript
/**
 * @title FFT Spectrum Bars
 * @description Visualizes frequency spectrum as vertical bars. Bass on the left, treble on the right.
 */

t.fontSize(12);

t.layers.base.draw(() => {
  if (!audio.hasData()) return;

  const fft = audio.fft();
  const cols = t.grid.cols;
  const rows = t.grid.rows;
  const step = Math.max(1, Math.floor(fft.length / cols));

  t.clear();

  for (let i = 0; i < cols; i++) {
    let sum = 0;
    for (let j = i * step; j < Math.min((i + 1) * step, fft.length); j++) {
      sum += fft[j];
    }
    const avg = sum / (step * 255);
    const barHeight = Math.floor(avg * rows * 0.75);

    for (let y = rows - 1; y >= rows - barHeight; y--) {
      const intensity = (rows - y) / rows;
      t.charColor(
        intensity * 255,
        128 + intensity * 127,
        255 - intensity * 255
      );
      t.cell(i, y, '#');
    }
  }
});
```

### Bass-Driven Kaleidoscope

```javascript
/**
 * @title Bass-Driven Kaleidoscope
 * @description Simple geometric pattern whose symmetry and scale respond to bass and volume.
 */

t.fontSize(14);

t.layers.base.synth(
  char(
    osc(15, 0.03, 0.6)
      .kaleid(() => 2 + Math.floor(audio.bass() * 10))
      .scale(() => 0.8 + audio.volume() * 0.4)
      .rotate(() => t.secs * 0.3 + audio.high() * 2)
  )
    .charColor(
      gradient(0.5)
        .hue(() => (t.secs * 0.2 + audio.mid()) % 1)
        .saturate(1.5)
    )
    .cellColor(solid(0.02, 0.02, 0.06))
    .charMap("  .:-=+*#%@")
);
```

### Waveform Oscilloscope

```javascript
/**
 * @title Waveform Oscilloscope
 * @description Draws the time-domain waveform as a scrolling line across the grid.
 */

t.fontSize(8);

t.layers.base.draw(() => {
  if (!audio.hasData()) return;

  const waveform = audio.waveform();
  const cols = t.grid.cols;
  const rows = t.grid.rows;
  const center = Math.floor(rows / 2);
  const step = Math.max(1, Math.floor(waveform.length / cols));

  t.clear();

  for (let x = 0; x < cols; x++) {
    let sum = 0;
    let count = 0;
    for (let j = x * step; j < Math.min((x + 1) * step, waveform.length); j++) {
      sum += waveform[j];
      count++;
    }
    const avg = sum / count / 255;
    const y = center + Math.floor((avg - 0.5) * rows * 0.8);

    t.charColor(150 + (avg * 100), 255, 200);
    t.cell(x, Math.max(0, Math.min(rows - 1, y)), '#');
  }
});
```
