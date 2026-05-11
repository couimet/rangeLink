import * as os from 'node:os';
import * as path from 'node:path';

import { defineConfig } from '@vscode/test-cli';

// Same timeout as the main config — assisted tests block on human interaction.
const MOCHA_TIMEOUT_MS = 600_000;
const USER_DATA_DIR = path.join(os.tmpdir(), 'rl-vscode-test-with-ext');

// Extensions installed from the marketplace before tests run.
// With these present, isClaudeCodeAvailable() returns true, enabling [assisted]
// tests that verify real focus + paste behavior.
const MARKETPLACE_EXTENSIONS = ['anthropic.claude-code'];

export default defineConfig([
  {
    files: 'out/__integration-tests__/suite/**/*.test.js',
    extensionDevelopmentPath: ['./', './test-fixtures/dummy-ai-extension/'],
    workspaceFolder: './',
    version: 'stable',
    installExtensions: MARKETPLACE_EXTENSIONS,
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
