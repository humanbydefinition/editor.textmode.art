import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
	{ ignores: ['coverage/**', 'dist/**', 'sketches/**'] },
	{ files: ['**/*.{ts,js}'], languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['src/{features,shared}/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '@/platform/state/appStore',
							importNames: ['useAppStore', 'initAppStore'],
							message:
								'Use a store adapter instead of importing the Zustand store directly. Only app/ and platform/ are allowed store boundaries.',
						},
					],
				},
			],
		},
	},
];
