import path from 'node:path';
import { defineConfig } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '../..');

export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.spec.ts',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 120_000,
	outputDir: path.join(root, 'test-results', 'og'),
	preserveOutput: 'failures-only',
	updateSnapshots: 'none',
	snapshotPathTemplate: path.join(root, '{arg}{ext}'),
	expect: {
		timeout: 10_000,
		toMatchSnapshot: {
			maxDiffPixels: 0,
			threshold: 0,
		},
	},
	reporter: process.env.CI
		? [['list'], ['html', { outputFolder: path.join(root, 'playwright-report'), open: 'never' }]]
		: 'list',
});
