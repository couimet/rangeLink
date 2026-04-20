import * as os from 'node:os';
import * as path from 'node:path';

import { defineConfig } from '@vscode/test-cli';

// 10 minutes per test — assisted tests block on human interaction (modal
// verdict dialogs don't auto-dismiss), so the human needs headroom to read
// instructions, complete UI actions, or step away for a break. Automated tests
// never come close to this threshold.
const MOCHA_TIMEOUT_MS = 600_000;
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
