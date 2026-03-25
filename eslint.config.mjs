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
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.history/**',
      '**/.venv/**',
      '**/.vscode-test/**',
      '**/.claude-work/**',
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
        // Timer globals
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
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
  {
    // Integration tests use Mocha TDD interface globals (suite/test/suiteSetup/suiteTeardown/setup/teardown)
    // rather than Jest's describe/it — @vscode/test-cli runs these in the VS Code extension host
    files: ['**/__integration-tests__/**/*.ts'],
    languageOptions: {
      globals: {
        suite: 'readonly',
        test: 'readonly',
        suiteSetup: 'readonly',
        suiteTeardown: 'readonly',
        setup: 'readonly',
        teardown: 'readonly',
      },
    },
  },
  {
    // VSCode extension: process is used for terminal process IDs and platform detection
    files: ['packages/rangelink-vscode-extension/src/**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
  },
  {
    // Demo files: fetch is a browser/Node 18+ global used in example code
    files: ['demo/**/*.ts'],
    languageOptions: {
      globals: {
        fetch: 'readonly',
      },
    },
  },
  // Keep Prettier as the last extend to disable stylistic conflicts
  eslintConfigPrettier,
];
