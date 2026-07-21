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
  "socialLinks": [
    { "label": "Website", "url": "https://example.com" }
  ],
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

### Live-coding lifecycle

Inside `editor.textmode.art`, `t.setup()` runs once for every submitted code execution and is awaited before drawing resumes. This intentionally differs from standalone textmode.js, where setup runs once when the textmode instance initializes. Re-executing a stateful sketch should therefore rebuild its state from the edited code rather than relying on objects from the previous execution.

The runner automatically releases shaders, framebuffers, textures, layers, and synths created through textmode APIs before the next execution. Use the optional `onDispose()` global only for external side effects that the runner cannot own, such as custom DOM nodes, sockets, observers, timers, or event listeners:

```javascript
const controller = new AbortController();
window.addEventListener('pointermove', handlePointerMove, { signal: controller.signal });
onDispose(() => controller.abort());
```

Normal live execution preserves `t.frameCount` and `t.secs`, but creates a new JavaScript closure and setup state. Simulations that depend on accumulated framebuffer history should deliberately recreate or reseed that history during setup. Only the `Ctrl+Shift+R` hard reset recreates the runner and resets the timeline.

## `og.png`

Every gallery sketch includes a committed `1200×630` Open Graph image. Install Chromium once, then generate it locally:

```bash
npm run playwright:install
npm run generate:og -- your-sketch-slug
```

Use `--frame` to try another direct-seek frame without editing metadata:

```bash
npm run generate:og -- your-sketch-slug --frame 120
```

Once you choose a frame, store it as `ogFrame` in `meta.json` and regenerate the image without the override. The generator seeks `t.frameCount` and `t.secs` directly and renders one frame; it does not replay state accumulated by frames 1 through N. Audio input is represented by silence. Sketches that load remote images, fonts, or video still need network access to those assets.

You can regenerate all committed gallery images from their stored frames with `npm run generate:og -- --all`. Run `npm run generate:og -- --help` for the complete CLI reference.

### Pull request workflow

1. Add `meta.json` and `sketch.js` in a new slug folder.
2. Experiment with `npm run generate:og -- your-sketch-slug --frame <n>`; this override never edits `meta.json`.
3. Persist the chosen integer as `ogFrame` (or omit it to keep the frame-60 default).
4. Generate `og.png` again and visually inspect its artwork, title, and author label.
5. Run `npm test` and `npm run build` before opening the pull request.

The preview imports this repository's installed `textmode.js`, synth, filters, figlet, and export packages directly. It does not contact the hosted runner or editor backend. Direct seeking is best for time-based sketches; a sketch whose frame N depends on mutations made during frames 1 through N-1 must adapt its capture frame to be independently renderable. Audio analysis uses fixed silent typed arrays and zero-valued levels.

Remote assets are not bundled into the preview. Their hosts must be reachable, allow browser loading, and finish before the setup timeout; prefer repository-local assets when deterministic output matters.

### Troubleshooting

- If Chromium is missing, run `npm run playwright:install` and retry.
- On Linux hosts missing browser system libraries, run `npx playwright install --with-deps chromium`.
- The generator prefers full Chromium with software WebGL flags and falls back to Playwright's default Chromium. If WebGL still fails, update Chromium/Playwright and verify WebGL2 is available in the environment.
- Setup, top-level async code, drawing, browser, and timeout errors include the sketch slug. Fix the first reported preview error, then rerun the same command; an existing valid `og.png` is left untouched when capture fails.

Production builds validate the PNG signature and exact dimensions, copy each image to `/og/<slug>.png`, and emit crawler-readable HTML at `/s/<slug>/` without changing the root editor metadata.

## Review Expectations

You retain your copyright in sketches you submit. By submitting a pull request, you confirm that you have the rights to contribute the sketch and grant this project permission to include, host, run, modify, and distribute it under the repository's AGPL-3.0-or-later terms as part of `editor.textmode.art`.

You may also declare an additional standalone license in `meta.json`. That license applies to reuse of the sketch as an independent creative/code work outside the bundled app. If `license` is `null`, no additional standalone license is declared.

Merged sketches are considered approved gallery sketches and may run automatically when users open `/s/<slug>/` or press the random sketch button.
