import path from 'path';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	envDir: path.resolve(__dirname, '../..'),
	envPrefix: ['VITE_', 'PUBLIC_'],
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		cors: true,
		headers: {
			'Access-Control-Allow-Origin': '*',
		},
	},
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
			},
		},
	},
});
