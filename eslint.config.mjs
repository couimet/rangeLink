import baseConfig from '@couimet/eslint-config/eslint';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    rules: {
      'barrel-boundary/enforce-barrel-files': 'off',
    },
  },
  {
    ignores: ['**/out/**', '**/coverage2/**', '**/.vscode-test/**', '**/.claude-work/**', '**/*.vsix', '**/scripts/**', '**/test-fixtures/**'],
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
