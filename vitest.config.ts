import { defineTextmodeProject } from '@textmode/vitest-config';
import type { UserWorkspaceConfig } from 'vitest/config';

const projects: Array<UserWorkspaceConfig & { extends: true }> = [
	{
		extends: true,
		test: {
			name: 'node',
			environment: 'node',
			globals: false,
			include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/integration/**/*.test.ts'],
			exclude: ['**/*.dom.test.ts'],
			clearMocks: true,
			restoreMocks: true,
		},
	},
	{
		extends: true,
		test: {
			name: 'dom',
			environment: 'jsdom',
			globals: false,
			include: ['src/**/*.dom.test.ts', 'tests/integration/**/*.dom.test.ts'],
			clearMocks: true,
			restoreMocks: true,
		},
	},
];

export default defineTextmodeProject({
	coverage: {
		provider: 'v8',
		include: [
			'src/app/runtime/CodeRandomizer.ts',
			'src/app/runtime/code-randomizer/**/*.ts',
			'src/features/*/model/**/*.ts',
			'src/platform/**/*.ts',
			'src/textmode/TextmodeController.ts',
			'src/textmode/runtime/**/*.ts',
			'scripts/gallery/project.ts',
			'scripts/gallery/social-pages.ts',
			'scripts/editor-types/cli.ts',
			'scripts/editor-types/declaration-transform.ts',
			'scripts/editor-types/generator.ts',
			'scripts/og/cli.ts',
			'scripts/og/contracts.ts',
			'scripts/og/image.ts',
		],
		exclude: ['src/**/index.ts', 'src/**/content/**', 'src/**/config/generated/**'],
		reporter: ['text', 'html'],
		reportsDirectory: 'coverage',
		reportOnFailure: true,
		thresholds: {
			statements: 75,
			branches: 60,
			functions: 70,
			lines: 80,
		},
	},
	projects,
});
