import { defineConfig } from '@vscode/test-cli';

import { ASSISTED_TIMEOUT_MS, BASE_CONFIG } from './.vscode-test.base.mjs';

const MOCHA_TIMEOUT = process.env.RANGELINK_MOCHA_TIMEOUT
  ? Number(process.env.RANGELINK_MOCHA_TIMEOUT)
  : ASSISTED_TIMEOUT_MS;

export default defineConfig([
  {
    ...BASE_CONFIG,
    mocha: { timeout: MOCHA_TIMEOUT, ...BASE_CONFIG.mocha },
  },
]);
