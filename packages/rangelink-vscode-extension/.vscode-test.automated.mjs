import { BASE_CONFIG, CI_TIMEOUT_MS } from './.vscode-test.base.mjs';

import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    ...BASE_CONFIG,
    mocha: { timeout: CI_TIMEOUT_MS, ...BASE_CONFIG.mocha },
  },
]);
