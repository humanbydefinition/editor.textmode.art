import shared from '@textmode/lint';

export default [
	{ ignores: ['coverage/**', 'dist/**', 'sketches/**', 'src/textmode/config/generated/**'] },
	...shared,
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
