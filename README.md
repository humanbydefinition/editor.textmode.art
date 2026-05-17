# synth.textmode.art (✿◠‿◠)

<div align="center">

| [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) | [![website](https://img.shields.io/badge/website-synth.textmode.art-646cff?logo=web&logoColor=white)](https://synth.textmode.art/) [![Discord](https://img.shields.io/discord/1357070706181017691?color=5865F2&label=Discord&logo=discord&logoColor=white)](https://discord.gg/sjrw8QXNks) | [![ko-fi](https://shields.io/badge/ko--fi-donate-ff5f5f?logo=ko-fi)](https://ko-fi.com/V7V8JG2FY) [![Github-sponsors](https://img.shields.io/badge/sponsor-30363D?logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/humanbydefinition) |
|:-------------|:-------------|:-------------|

</div>

`synth.textmode.art` is a browser-based live coding environment for procedural text generation and ASCII synthesis. It builds on [`textmode.js`](https://github.com/humanbydefinition/textmode.js) to create a browser-based creative coding environment with real-time execution.

## Features

- **Visual synthesis**: Driven by `textmode.js`, offering a rich set of ASCII/textmode graphics tools and a modern WebGL2 pipeline.
- **High-performance editor**: Built on Monaco Editor (the power behind VS Code) with custom syntax highlighting and tailored type definitions.
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

# Start dev server (Vite)
npm run dev

# Build for production
npm run build
```

The client loads the hosted sandbox runner from `https://runner.textmode.art/` by default.
Set `VITE_RUNNER_URL` to override the iframe URL for local testing or alternate deployments.

## License

This application is licensed under the **GNU Affero General Public License v3.0 or later** - see the [LICENSE](LICENSE) file for details.

Gallery sketches under [`sketches/`](sketches/) are included under the contribution terms in [`CONTRIBUTING.md`](CONTRIBUTING.md) and may declare an additional standalone license in their `meta.json`.

### Acknowledgements

This project targets the [`textmode.js`](https://github.com/humanbydefinition/textmode.js) sketch API.

AGPL-licensed dependency acknowledgement:

- **[textmode.synth.js](https://github.com/humanbydefinition/textmode.synth.js)** - AGPL-3.0
