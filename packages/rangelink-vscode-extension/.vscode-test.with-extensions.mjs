import { ASSISTED_TIMEOUT_MS, BASE_CONFIG, userDataDir } from './.vscode-test.base.mjs';

import { defineConfig } from '@vscode/test-cli';

// Marketplace extensions installed before tests run. With these present,
// isGeminiCodeAssistAvailable(), isClaudeCodeAvailable() and isClineAvailable()
// return true, enabling tests that verify real focus + paste behavior.
const MARKETPLACE_EXTENSIONS = ['google.geminicodeassist', 'anthropic.claude-code', 'saoudrizwan.claude-dev'];

export default defineConfig([
  {
    ...BASE_CONFIG,
    launchArgs: userDataDir('-with-ext'),
    installExtensions: MARKETPLACE_EXTENSIONS,
    mocha: { timeout: ASSISTED_TIMEOUT_MS, ...BASE_CONFIG.mocha },
  },
]);
