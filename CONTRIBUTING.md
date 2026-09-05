# Contributing to editor.textmode.art

Thanks for contributing to editor.textmode.art. This guide explains how to
submit a sketch to the repository-backed gallery.

Every merged gallery sketch lives in [`sketches/`](sketches/), has a
shareable `/s/<slug>/` page, and may appear through the editor's
random-sketch action. The guide covers the required files, preview image, and
pull-request workflow.

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
	"ogFrame": 60,
	"ogDarken": 70
}
```

- `slug` must match the folder name and use 3–32 lowercase letters, numbers,
  and hyphens.
- `description`, `authorName`, `license`, and `socialLinks` can be `null`.
- `ogFrame` is optional, must be an integer from 1 to 1000, and defaults to 60.
- `ogDarken` is optional, must be an integer from 0 to 100, and defaults to 55.
  It controls the opacity how much the sketch is darkened in the Open Graph preview image.
- `interactive` is optional and must be a boolean (e.g., `true` for sketches responding to mouse or user interaction).
- `audio-reactive` is optional and must be a boolean (e.g., `true` for sketches reacting to microphone or audio input).
- Prefer SPDX identifiers such as `MIT`, `Apache-2.0`, or `CC-BY-4.0` for a
  standalone sketch license when one applies.
- Social links must use HTTPS.

## `sketch.js`

Keep the code self-contained and compatible with the live editor, including
names such as `t`, `osc`, `noise`, `gradient`, `char`, and `shape`. It must not
be empty or exceed 300,000 characters.

Gallery sketches must render deterministically. Do not use `Math.random()`,
`Date.now()`, `performance.now()`, or crypto randomness. Seed textmode random
and noise before using them:

```javascript
t.randomSeed('your-sketch-v1');
t.noiseSeed('your-sketch-v1');
```

The test suite rejects ambient entropy and unseeded textmode random or noise
usage. Review also checks metadata validity, compatibility with the live
editor, and gallery suitability.

## `og.png`

Every gallery sketch includes a committed 1200×630 Open Graph image:

```bash
npm run playwright:install
npm run generate:og -- your-sketch-slug
```

Try another capture frame or darken level without editing metadata:

```bash
npm run generate:og -- your-sketch-slug --frame 120 --darken 70
```

Persist the selected frame as `ogFrame` and the darken as `ogDarken`, then
regenerate without the overrides.
The renderer runs from the initial frame through the selected frame before it
captures the image. Audio input is silence. Relative images, fonts, video, and
data resolve from the sketch folder; remote assets must still be reachable.

Run `npm run generate:og -- --all` to regenerate all gallery images, or
`npm run generate:og -- --help` for the full CLI reference. Rendering is
provided by [`@textmode/og`](https://www.npmjs.com/package/@textmode/og), which
bundles compatible textmode.js, synth, filters, figlet, and export versions. It
does not contact the hosted runner or editor backend.

Production builds validate each PNG, copy it to `/og/<slug>.png`, and emit
crawler-readable HTML at `/s/<slug>/`.

## Pull request workflow

1. Create `meta.json` and a self-contained, deterministic `sketch.js` in a new
   `sketches/<slug>/` folder.
2. Check the slug and metadata, then test the sketch in the editor.
3. Install Chromium once with `npm run playwright:install`.
4. Choose a preview frame with
   `npm run generate:og -- your-sketch-slug --frame <n>`. This override does
   not edit `meta.json`.
5. Save the frame as `ogFrame`, generate the committed `og.png`, and inspect
   its artwork, title, description, and author label.
6. Run `npm run check`, then open a pull request containing `meta.json`,
   `sketch.js`, and `og.png`.

## Review expectations and licensing

You retain copyright in your sketch. By submitting it, you confirm that you
have the right to contribute it and grant permission for it to be included,
hosted, run, modified, and distributed as part of editor.textmode.art under
the repository's [AGPL-3.0-or-later](LICENSE) terms.

You may declare an additional standalone license in `meta.json`. It governs
independent reuse of the sketch outside the bundled application; use `null`
when no additional license is declared.
