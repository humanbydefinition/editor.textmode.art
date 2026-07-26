import path from 'path';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	envDir: __dirname,
	envPrefix: ['VITE_', 'PUBLIC_'],
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		cors: true,
	},
	build: {
		rolldownOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
			},
		},
	},
});
