import path from 'path';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
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
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        xfwd: true,
      },
      // Use ^/s/ to match /s/:slug paths but not /src/*
      '^/s/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        runner: resolve(__dirname, 'src/engines/textmode/runner/index.html'),
      },
    },
  },
});
