// eslint.config.js
// @ts-check
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  { ignores: ['dist/**', 'node_modules/**', 'eslint.config.js'] },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  ...compat.extends('airbnb-base'),

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    plugins: {
      import: importPlugin,
      '@typescript-eslint': tseslint.plugin
    },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json', alwaysTryTypes: true } },
      'import/parsers': { '@typescript-eslint/parser': ['.ts'] }
    },
    rules: {
      'import/extensions': ['error', 'ignorePackages', { ts: 'never' }],
      'import/no-unresolved': 'error',
      'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc', caseInsensitive: true } }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-underscore-dangle': 'off',
    }
  }
];
