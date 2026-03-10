import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    files: 'out/__integration-tests__/suite/**/*.test.js',
    extensionDevelopmentPath: './',
    version: 'stable',
    mocha: {
      timeout: 20000,
    },
  },
]);
