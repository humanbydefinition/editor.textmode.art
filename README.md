# synth.textmode.art (✿◠‿◠)

<div align="center">

| [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) | [![website](https://img.shields.io/badge/website-synth.textmode.art-646cff?logo=web&logoColor=white)](https://synth.textmode.art/) [![Discord](https://img.shields.io/discord/1357070706181017691?color=5865F2&label=Discord&logo=discord&logoColor=white)](https://discord.gg/sjrw8QXNks) | [![ko-fi](https://shields.io/badge/ko--fi-donate-ff5f5f?logo=ko-fi)](https://ko-fi.com/V7V8JG2FY) [![Github-sponsors](https://img.shields.io/badge/sponsor-30363D?logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/humanbydefinition) |
|:-------------|:-------------|:-------------|

</div>

> [!IMPORTANT]
> **Work in progress**: This project is currently in active development. Features and APIs are subject to change.

`synth.textmode.art` is a live coding environment for procedural text generation, ASCII synthesis, and algorithmic patterns. It combines the visual power of [`textmode.js`](https://github.com/humanbydefinition/textmode.js) with the algorithmic music patterns of [`Strudel`](https://codeberg.org/uzu/strudel) to create a unique hybrid creative coding experience.

The environment is designed to be accessible yet powerful, providing a high-performance integrated editor for real-time creation of multi-layered textmode scenes and complex polyphonic patterns.


## Features

- **Hybrid live coding**: Seamlessly blend procedural ASCII visuals with algorithmic audio patterns.
- **Visual synthesis**: Driven by `textmode.js`, offering a rich set of ASCII/textmode graphics tools and a modern WebGL2 pipeline.
- **Algorithmic audio**: Integrated with `@strudel/web` for complex, live-coded musical compositions.
- **High-performance editor**: Built on Monaco Editor (the power behind VS Code) with custom syntax highlighting and tailored type definitions.
- **Plugin-based architecture**: Modular design that separates visual and audio concerns, allowing for easy updates and future extensions.
- **Local persistence**: Automatically saves your work and settings to your browser's local storage.
- **Responsive layout**: Designed for both desktop and mobile devices, ensuring your sketches look great everywhere.

> [!NOTE]
> Performance depends on the complexity of your scripts and device capabilities. 

## Getting started

Visit **[synth.textmode.art](https://synth.textmode.art)** to start coding immediately - no installation required.

1. **Start coding**: Write your scripts in the integrated editors. The environment will auto-execute your changes by default.
2. **Explore examples**: Check the `Examples` menu to see what's possible and learn from pre-made sketches.
3. **Customize**: Use the `Preferences` menu to toggle UI visibility, adjust font sizes, or change editor settings.

## Development

To run the project locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Server Development

The server provides sketch moderation, slug pages, and screenshot generation:

```bash
# Start server in development mode
npm run -w @synth.textmode.art/server dev

# Regenerate all approved sketch screenshots
npm run -w @synth.textmode.art/server screenshots:regenerate

# Install Playwright/Chromium for screenshot service
npm run -w @synth.textmode.art/server playwright:install
```

### Sandbox configuration (recommended)

To run the textmode runner on a separate origin (recommended for isolation), set:

- `VITE_RUNNER_URL` (client): Full URL to the runner HTML (e.g. `https://runner.synth.textmode.art/runner/index.html`)
- `VITE_RUNNER_PARENT_ORIGINS` (runner): Comma-separated list of allowed parent origins (e.g. `https://synth.textmode.art`)
- `VITE_MEDIA_PROXY_URL` (runner, optional): Full URL to the media proxy endpoint (defaults to `${firstParentOrigin}/api/media` when unset)
- `RUNNER_PUBLIC_URL` (server): Public runner origin for CSP and CORS (e.g. `https://runner.synth.textmode.art`)

The media proxy endpoint is exposed at `GET /api/media?url=...` on the app server and is used as a CORS fallback for `t.loadImage`/`t.loadVideo`.

## License

This project is licensed under the **GNU Affero General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

### Third party licenses & acknowledgements

`synth.textmode.art` is built upon several incredible open-source projects. We are grateful for their work and explicit permissions to use their software:

- **[textmode.js](https://github.com/humanbydefinition/textmode.js)** - MIT License
- **[textmode.synth.js](https://github.com/humanbydefinition/textmode.synth.js)** - AGPL-3.0 License
- **[textmode.filters.js](https://github.com/humanbydefinition/textmode.filters.js)** - MIT License
- **[@strudel/web](https://strudel.cc/)** - AGPL-3.0 License
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** - MIT License
- **[React](https://react.dev/)** - MIT License
- **[zustand](https://github.com/pmndrs/zustand)** - MIT License
- **[Vite](https://vitejs.dev/)** - MIT License
- **[Tailwind CSS](https://tailwindcss.com/)** - MIT License
- **[Radix UI](https://www.radix-ui.com/)** - MIT License
- **[shadcn/ui](https://ui.shadcn.com/)** - MIT License
- **[TypeScript](https://www.typescriptlang.org/)** - Apache-2.0 License
