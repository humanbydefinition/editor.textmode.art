import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

const architectureZones = [
	// core should stay independent from concrete runner implementations
	{ target: './src/core', from: './src/engines/textmode' },
];

export default [
	{ ignores: ['dist'] },
	{
		files: ['**/*.{ts,js}'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
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
