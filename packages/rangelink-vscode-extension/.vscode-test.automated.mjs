import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    files: 'out/__integration-tests__/suite/**/*.test.js',
    extensionDevelopmentPath: './',
    workspaceFolder: './',
    version: 'stable',
    launchArgs: ['--user-data-dir', '/tmp/rl-vscode-test'],
    env: {
      RANGELINK_CAPTURE_LOGS: 'true',
    },
    mocha: {
      timeout: 20000,
      grep: '\\[assisted\\]',
      invert: true,
    },
  },
]);
