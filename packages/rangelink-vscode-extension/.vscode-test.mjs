import * as os from 'node:os';
import * as path from 'node:path';

import { defineConfig } from '@vscode/test-cli';

const MOCHA_TIMEOUT_MS = 300_000;
const USER_DATA_DIR = path.join(os.tmpdir(), 'rl-vscode-test');

export default defineConfig([
  {
    files: 'out/__integration-tests__/suite/**/*.test.js',
    extensionDevelopmentPath: ['./', './test-fixtures/dummy-ai-extension/'],
    workspaceFolder: './',
    version: 'stable',
    launchArgs: ['--user-data-dir', USER_DATA_DIR],
    env: {
      RANGELINK_CAPTURE_LOGS: 'true',
    },
    mocha: {
      timeout: MOCHA_TIMEOUT_MS,
      ...(process.env.MOCHA_GREP ? { grep: process.env.MOCHA_GREP } : {}),
    },
  },
]);
