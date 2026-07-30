import baseConfig from '@couimet/eslint-config/eslint';
import prettierOptions from '@couimet/eslint-config/prettier';
import globals from 'globals';

export default [
  ...baseConfig,
  // TODO [2026-12-31]: https://github.com/couimet/rangeLink/issues/699 — remove printWidth override and adopt upstream 160
  {
    rules: {
      'prettier/prettier': ['error', { ...prettierOptions, printWidth: 100, endOfLine: 'auto' }],
      'barrel-boundary/enforce-barrel-files': 'off',
    },
  },
  {
    ignores: [
      '**/out/**',
      '**/coverage2/**',
      '**/.vscode-test/**',
      '**/.claude-work/**',
      '**/*.vsix',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.cjs',
      '**/scripts/**',
      '**/test-fixtures/**',
    ],
  },
  {
    files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // ts-jest v29 doesn't resolve barrel index.js → index.ts with node16
      // module resolution, so barrel-boundary rewriting breaks test imports
      'barrel-boundary/enforce-barrel-files': 'off',
    },
  },
  {
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
];
