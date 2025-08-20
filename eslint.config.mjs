// Flat ESLint config (ESM) for ESLint v9+
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astroPlugin from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import path from 'node:path';

export default [
  { ignores: ['dist','dist/**','resume-generator/output','resume-generator/output/**','.astro','.astro/*','.astro/**'] },
  js.configs.recommended,
  ...astroPlugin.configs['flat/recommended'],
  ...tseslint.config({
    extends: [tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: path.resolve('.'),
        extraFileExtensions: ['.astro']
      }
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn',{ argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }),
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];
