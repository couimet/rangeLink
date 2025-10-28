import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import js from '@eslint/js';
import n from 'eslint-plugin-n';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';

export default [
  {
    ignores: ['out/**', 'node_modules/**', 'coverage/**']
  },
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      parserOptions: {
        // Not enabling full type-checking to keep lint fast; can be enabled later
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      unicorn,
      n
    },
    settings: {
      'import/resolver': {
        typescript: {}
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ],
      'unicorn/prefer-node-protocol': 'error'
    }
  },
  // Keep Prettier as the last extend to disable stylistic conflicts
  eslintConfigPrettier
];


