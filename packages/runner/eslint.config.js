import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

const architectureZones = [
	// core should stay independent from concrete runner implementations
	{ target: './src/core', from: './src/strudel' },
	{ target: './src/core', from: './src/execution' },
	{ target: './src/core', from: './src/lib' },
	{ target: './src/core', from: './src/sandbox' },
	{ target: './src/core', from: './src/TextmodeRunner.ts' },
	// strudel implementation should not depend on textmode-specific modules
	{ target: './src/strudel', from: './src/execution' },
	{ target: './src/strudel', from: './src/lib' },
	{ target: './src/strudel', from: './src/sandbox' },
	{ target: './src/strudel', from: './src/TextmodeRunner.ts' },
	// textmode implementation should not depend on strudel modules
	{ target: './src/execution', from: './src/strudel' },
	{ target: './src/lib', from: './src/strudel' },
	{ target: './src/sandbox', from: './src/strudel' },
	{ target: './src/TextmodeRunner.ts', from: './src/strudel' },
];

export default [
	{ ignores: ['dist'] },
	{
		files: ['**/*.{ts,js}'],
		languageOptions: {
			globals: globals.browser,
		},
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		plugins: { import: importPlugin },
		rules: {
			'import/no-restricted-paths': [
				'error',
				{
					zones: architectureZones,
				},
			],
		},
	},
];
