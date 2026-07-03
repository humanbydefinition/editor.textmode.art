# Gallery Sketches

Repository-backed gallery sketches live in this directory. Each merged sketch is treated as reviewed and can be loaded by the random sketch button and by its `/s/<slug>` URL.

## Structure

Add one folder per sketch:

```text
sketches/
  your-sketch-slug/
    meta.json
    sketch.js
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
  "createdAt": "2026-05-16T00:00:00.000Z"
}
```

Rules:

- `slug` must match the folder name.
- Slugs use lowercase letters, numbers, and hyphens only.
- Slugs must be 3 to 32 characters.
- `description`, `authorName`, `license`, and `socialLinks` can be `null`.
- `license` is the author's additional standalone reuse license for the sketch itself. SPDX identifiers such as `MIT`, `Apache-2.0`, or `CC-BY-4.0` are preferred when they fit.
- Social link URLs must use `https`.

## `sketch.js`

`sketch.js` should contain the code that runs in `editor.textmode.art`. Keep it self-contained and compatible with the same live-coding names available in the editor, such as `t`, `osc`, `noise`, `gradient`, `char`, and `shape`.

The code must not be empty and must stay under 300,000 characters.

Gallery sketch code is not linted by the project ESLint setup. Sketch PR review focuses on metadata validity, compatibility with the live editor, and whether the sketch is appropriate for the gallery.

## Review Expectations

You retain your copyright in sketches you submit. By submitting a pull request, you confirm that you have the rights to contribute the sketch and grant this project permission to include, host, run, modify, and distribute it under the repository's AGPL-3.0-or-later terms as part of `editor.textmode.art`.

You may also declare an additional standalone license in `meta.json`. That license applies to reuse of the sketch as an independent creative/code work outside the bundled app. If `license` is `null`, no additional standalone license is declared.

Merged sketches are considered approved gallery sketches and may run automatically when users open `/s/<slug>` or press the random sketch button.
