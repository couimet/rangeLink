import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import js from '@eslint/js';
import n from 'eslint-plugin-n';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';

export default [
  {
    ignores: [
      '**/out/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.history/**',
      '**/*.vsix',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.cjs',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
      parserOptions: {
        // Not enabling full type-checking to keep lint fast; can be enabled later
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      unicorn,
      n,
    },
    settings: {
      'import/resolver': {
        typescript: {},
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      // Disable base no-redeclare: @typescript-eslint/no-redeclare requires type-aware linting
      // (project: true) to recognize valid type+const companion patterns. Without it, the TS rule
      // still flags valid code. TypeScript compiler catches actual redeclarations at compile time,
      // and typescript-eslint recommends NOT enabling this rule in TypeScript projects.
      'no-redeclare': 'off',
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'unicorn/prefer-node-protocol': 'error',
    },
  },
  {
    // Test files: allow `any` for testing private methods and creating mocks
    files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Keep Prettier as the last extend to disable stylistic conflicts
  eslintConfigPrettier,
];
