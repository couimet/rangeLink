import * as os from 'node:os';
import * as path from 'node:path';

// 10 minutes per test — assisted tests block on human interaction.
export const ASSISTED_TIMEOUT_MS = 600_000;

// No human in CI — automated tests resolve in under 5s.
export const CI_TIMEOUT_MS = 20_000;

export const userDataDir = (suffix = '') => [
  '--user-data-dir',
  path.join(os.tmpdir(), `rl-vscode-test${suffix}`),
];

// grep and invert are driven by env vars set in test-release-run.sh.
const envMocha = () => ({
  ...(process.env.MOCHA_GREP ? { grep: process.env.MOCHA_GREP } : {}),
  ...(process.env.MOCHA_INVERT === 'true' ? { invert: true } : {}),
});

export const BASE_CONFIG = {
  files: 'out/__integration-tests__/suite/**/*.test.js',
  extensionDevelopmentPath: ['./', './test-fixtures/dummy-ai-extension/'],
  workspaceFolder: './',
  version: 'stable',
  launchArgs: userDataDir(),
  env: { RANGELINK_CAPTURE_LOGS: 'true', RANGELINK_TEST_FIXTURES_ENABLED: 'true' },
  mocha: envMocha(),
};
