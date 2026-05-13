import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['tests/**/*.test.ts'],
		clearMocks: true,
		restoreMocks: true,
	},
});
