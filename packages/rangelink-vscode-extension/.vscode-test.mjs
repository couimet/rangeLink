import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    files: 'out/__integration-tests__/suite/**/*.test.js',
    extensionDevelopmentPath: './',
    workspaceFolder: './',
    version: 'stable',
    mocha: {
      timeout: 20000,
    },
  },
]);
