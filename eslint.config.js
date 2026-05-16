import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

const architectureZones = [
  // shared/ cannot import from project
  { target: './src/shared', from: './src', except: ['./shared'] },
  // core/ can only import shared/
  { target: './src/core', from: './src', except: ['./core', './shared'] },
  // platform/ cannot import engines/ or features/
  { target: './src/platform', from: './src/engines' },
  { target: './src/platform', from: './src/features' },
  { target: './src/platform', from: './src/app' },
  // engines/ cannot import features/ or app/
  { target: './src/engines', from: './src/features' },
  { target: './src/engines', from: './src/app' },
  // features/ cannot import app/
  { target: './src/features', from: './src/app' },
  // No cross-feature imports (manual listing for now, strict mode)
  { target: './src/features/share', from: './src/features', except: ['./share'] },
  { target: './src/features/examples', from: './src/features', except: ['./examples'] },
  { target: './src/features/system-menu', from: './src/features', except: ['./system-menu'] },
  { target: './src/features/editor-layout', from: './src/features', except: ['./editor-layout'] },
];

export default [
  { ignores: ['dist/**', 'sketches/**'] },
  { files: ['**/*.{ts,js}'], languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { import: importPlugin },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: architectureZones,
        },
      ],
    },
  },
  {
    files: ['src/{core,engines,features,shared}/**/*.ts'],
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
