import path from 'path';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    envDir: path.resolve(__dirname, '..'),
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5174,
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                textmode: resolve(__dirname, 'textmode.html'),
                strudel: resolve(__dirname, 'strudel.html'),
            },
        },
    },
});
