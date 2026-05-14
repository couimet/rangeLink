import { defineConfig } from '@vscode/test-cli';

import { ASSISTED_TIMEOUT_MS, BASE_CONFIG, userDataDir } from './.vscode-test.base.mjs';

// Marketplace extensions installed before tests run. With these present,
// isClaudeCodeAvailable() returns true, enabling tests that verify real
// focus + paste behavior.
const MARKETPLACE_EXTENSIONS = ['anthropic.claude-code'];

export default defineConfig([
  {
    ...BASE_CONFIG,
    launchArgs: userDataDir('-with-ext'),
    installExtensions: MARKETPLACE_EXTENSIONS,
    mocha: { timeout: ASSISTED_TIMEOUT_MS, ...BASE_CONFIG.mocha },
  },
]);
