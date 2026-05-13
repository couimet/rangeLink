import { defineConfig } from '@vscode/test-cli';

import { CI_TIMEOUT_MS, BASE_CONFIG } from './.vscode-test.base.mjs';

export default defineConfig([
  {
    ...BASE_CONFIG,
    mocha: { timeout: CI_TIMEOUT_MS, ...BASE_CONFIG.mocha },
  },
]);
