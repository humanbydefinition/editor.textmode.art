import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { generateEditorTypes } from './generator.js';

export const EDITOR_TYPES_HELP = `Generate Monaco editor type declarations.

Usage:
  npm run extract-types
  npm run extract-types -- --help

Options:
  --help, -h  Show this help.
`;

export function parseEditorTypesCliArgs(args: readonly string[]): { help: boolean } {
	const parsed = parseArgs({
		args: [...args],
		allowPositionals: false,
		strict: true,
		options: {
			help: { type: 'boolean', short: 'h' },
		},
		tokens: true,
	});
	const helpTokens = parsed.tokens.filter((token) => token.kind === 'option' && token.name === 'help');
	if (helpTokens.length > 1) throw new Error('Option --help may only be provided once.');
	return { help: parsed.values.help ?? false };
}

async function main(): Promise<void> {
	let options: { help: boolean };
	try {
		options = parseEditorTypesCliArgs(process.argv.slice(2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		console.error('Run "npm run extract-types -- --help" for usage.');
		process.exitCode = 1;
		return;
	}

	if (options.help) {
		console.log(EDITOR_TYPES_HELP);
		return;
	}

	const projectRoot = path.resolve(import.meta.dirname, '../..');
	try {
		const result = await generateEditorTypes({ projectRoot });
		const size = (result.byteLength / 1024).toFixed(1);
		console.log(
			`${result.status === 'written' ? 'Generated' : 'Verified'} ${path.relative(
				projectRoot,
				result.outputPath
			)}: ${result.declarationFileCount} declarations from ${result.packageCount} packages, ${result.removedDeclarationCount} internal declarations removed, ${size} KiB.`
		);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}

/* v8 ignore start -- @preserve */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	void main();
}
/* v8 ignore stop -- @preserve */
