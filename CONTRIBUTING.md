# Contributing to editor.textmode.art

## License

Application and project source contributions outside [`sketches/`](sketches/) are licensed under the [GNU Affero General Public License v3.0 or later](LICENSE).

Gallery sketch contributions use the additional licensing terms below so authors can keep clear reuse choices for their own work while the editor remains AGPL-compatible.

## Testing changes

- Run `npm test` while developing.
- Run `npm run test:coverage` when changing owned decision-making logic.
- Run `npm run check` before opening a pull request. It checks formatting, dependency policy, linting, test-inclusive types, scoped coverage, and the production build.

## Contributing gallery sketches

User-contributed gallery sketches are stored directly in this repository under [`sketches/`](sketches/). They power the random sketch button and `/s/<slug>/` gallery links.

Create one folder per sketch:

```text
sketches/
  your-sketch-slug/
    meta.json
    sketch.js
    og.png
```

Before opening a pull request:

- Pick a unique slug with lowercase letters, numbers, and hyphens only.
- Keep the slug between 3 and 32 characters.
- Make sure `meta.json` follows the schema documented in [`sketches/README.md`](sketches/README.md).
- Keep `sketch.js` self-contained and compatible with `editor.textmode.art`.
- Initialize stateful sketches in `t.setup()` so each submitted execution can recreate its state; the runner automatically releases resources created through textmode APIs.
- Install Chromium once with `npm run playwright:install`.
- Generate `og.png` with `npm run generate:og -- your-sketch-slug`; use `--frame` while choosing the best frame and persist that value as `ogFrame`.
- Run `npm run check`. The production build rejects missing, corrupt, or incorrectly sized gallery images.

Merged sketch PRs are treated as reviewed gallery entries. They may run automatically when users load their `/s/<slug>` URL or press the random sketch button.

## Gallery sketch licensing

The `editor.textmode.art` application remains licensed under the [GNU Affero General Public License v3.0 or later](LICENSE), including when it includes, hosts, or runs merged gallery sketches.

You retain your copyright in sketches you submit. By submitting files under [`sketches/`](sketches/), you confirm that you have the rights to contribute them and that you grant this project permission to include, host, run, modify, and distribute the submitted sketch under the AGPL-3.0-or-later terms as part of this repository and website.

You may also choose an additional standalone license for the sketch itself in `meta.json` using the `license` field. That license describes how others may reuse the sketch as an independent creative/code work outside the bundled `editor.textmode.art` application. If you set `license` to `null`, no additional standalone license is declared; the AGPL gallery inclusion grant above still applies.
