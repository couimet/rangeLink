import { defineConfig } from '@vscode/test-cli';

import { ASSISTED_TIMEOUT_MS, BASE_CONFIG } from './.vscode-test.base.mjs';

const parsed = Number(process.env.RANGELINK_MOCHA_TIMEOUT);
const MOCHA_TIMEOUT = Number.isFinite(parsed) && parsed >= 0 ? parsed : ASSISTED_TIMEOUT_MS;

export default defineConfig([
  {
    ...BASE_CONFIG,
    mocha: { timeout: MOCHA_TIMEOUT, ...BASE_CONFIG.mocha },
  },
]);
