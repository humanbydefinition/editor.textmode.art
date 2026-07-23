import { defineTextmodeProject } from '@textmode/vitest-config';

export default defineTextmodeProject({
	projects: [
		{
			extends: true,
			test: {
				name: 'editor',
				include: ['tests/**/*.test.ts'],
				clearMocks: true,
				restoreMocks: true,
			},
		},
	],
});
