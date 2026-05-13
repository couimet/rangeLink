import { defineConfig } from '@vscode/test-cli';

import { ASSISTED_TIMEOUT_MS, BASE_CONFIG } from './.vscode-test.base.mjs';

export default defineConfig([
  {
    ...BASE_CONFIG,
    mocha: { timeout: ASSISTED_TIMEOUT_MS, ...BASE_CONFIG.mocha },
  },
]);
