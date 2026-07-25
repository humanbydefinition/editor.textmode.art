# Gallery Sketches

Repository-backed gallery sketches live in this directory. Each merged sketch is treated as reviewed and can be loaded by the random sketch button and by its `/s/<slug>` URL.

## Structure

Add one folder per sketch:

```text
sketches/
  your-sketch-slug/
    meta.json
    sketch.js
    og.png
```

## `meta.json`

Use this shape:

```json
{
	"slug": "your-sketch-slug",
	"title": "Your Sketch Title",
	"description": "A short description of the sketch.",
	"authorName": "Your Name",
	"license": "MIT",
	"socialLinks": [{ "label": "Website", "url": "https://example.com" }],
	"createdAt": "2026-05-16T00:00:00.000Z",
	"ogFrame": 60
}
```

Rules:

- `slug` must match the folder name.
- Slugs use lowercase letters, numbers, and hyphens only.
- Slugs must be 3 to 32 characters.
- `description`, `authorName`, `license`, and `socialLinks` can be `null`.
- `ogFrame` is optional and must be an integer from 1 to 1000. It defaults to frame 60.
- `license` is the author's additional standalone reuse license for the sketch itself. SPDX identifiers such as `MIT`, `Apache-2.0`, or `CC-BY-4.0` are preferred when they fit.
- Social link URLs must use `https`.

## `sketch.js`

`sketch.js` should contain the code that runs in `editor.textmode.art`. Keep it self-contained and compatible with the same live-coding names available in the editor, such as `t`, `osc`, `noise`, `gradient`, `char`, and `shape`.

The code must not be empty and must stay under 300,000 characters.

Gallery sketch code is not linted by the project ESLint setup. Sketch PR review focuses on metadata validity, compatibility with the live editor, and whether the sketch is appropriate for the gallery.

Gallery sketches must render deterministically at a given timeline position. Do not use ambient entropy sources such as `Math.random()`, `Date.now()`, `performance.now()`, or `crypto` randomness. Seed textmode's random or noise generator before using it:

```javascript
t.randomSeed('your-sketch-v1');
t.noiseSeed('your-sketch-v1');
```

The test suite rejects ambient entropy and unseeded textmode random/noise usage in gallery sketches.

## `og.png`

Every gallery sketch includes a committed `1200×630` Open Graph image. Install Chromium once, then generate it locally:

```bash
npm run playwright:install
npm run generate:og -- your-sketch-slug
```

Use `--frame` to try another capture frame without editing metadata:

```bash
npm run generate:og -- your-sketch-slug --frame 120
```

Once you choose a frame, store it as `ogFrame` in `meta.json` and regenerate the image without the override. The generator renders from the initial frame until it reaches the selected `ogFrame`, then captures that frame. Audio input is represented by silence. Sketches that load remote images, fonts, or video still need network access to those assets.

You can regenerate all committed gallery images from their stored frames with `npm run generate:og -- --all`.  
Run `npm run generate:og -- --help` for the complete CLI reference.

The preview imports this repository's installed `textmode.js`, synth, filters, figlet, and export packages directly. It does not contact the hosted runner or editor backend. Because it renders through the selected frame, stateful sketches can build their normal frame-to-frame state before capture. Audio analysis uses fixed silent typed arrays and zero-valued levels.

Production builds validate the PNG signature and exact dimensions, copy each image to `/og/<slug>.png`, and emit crawler-readable HTML at `/s/<slug>/` without changing the root editor metadata.

## Pull request workflow

1. Create a new `sketches/<slug>/` folder and add a self-contained,
   deterministic `sketch.js` with its `meta.json`.
2. Check that the slug and metadata follow the rules above, and test the sketch
   in the editor before preparing its preview.
3. Install Chromium once with `npm run playwright:install`.
4. Choose the best preview frame with
   `npm run generate:og -- your-sketch-slug --frame <n>`. This override is
   only for experimentation; it does not edit `meta.json`.
5. Save the chosen integer as `ogFrame` (or omit it to use frame 60), then run
   `npm run generate:og -- your-sketch-slug` to create the committed
   `og.png`.
6. Visually inspect the image: the artwork, title, description, and author
   label must be readable and correctly attributed.
7. Run `npm run check`, then open a pull request containing `meta.json`,
   `sketch.js`, and `og.png`.

## Review Expectations

You retain your copyright in sketches you submit. By submitting a pull request, you confirm that you have the rights to contribute the sketch and grant this project permission to include, host, run, modify, and distribute it under the repository's AGPL-3.0-or-later terms as part of `editor.textmode.art`.

You may also declare an additional standalone license in `meta.json`. That license applies to reuse of the sketch as an independent creative/code work outside the bundled app. If `license` is `null`, no additional standalone license is declared.

Merged sketches are considered approved gallery sketches and may run automatically when users open `/s/<slug>/` or press the random sketch button.
