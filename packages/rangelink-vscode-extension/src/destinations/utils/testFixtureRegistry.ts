import type * as vscode from 'vscode';

import { ENV_RANGELINK_TEST_FIXTURES_ENABLED } from '../../constants';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';

const MARKER = '__rangeLinkTestFixture';

/**
 * Mark a terminal as a RangeLink test fixture so the bindability classifier
 * treats it as a normal bindable terminal.
 *
 * Sets a marker property directly on the terminal object so the bundled
 * extension can read it even though it lives in a separate esbuild module graph.
 *
 * Only callable when `process.env[ENV_RANGELINK_TEST_FIXTURES_ENABLED] === 'true'`.
 * Follows the same env-var gating pattern as `LogCapture.ts`.
 */
export const markRangeLinkTestFixture = (terminal: vscode.Terminal): void => {
  if (process.env[ENV_RANGELINK_TEST_FIXTURES_ENABLED] !== 'true') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.TEST_FIXTURE_REGISTRY_DISABLED,
      message: `markRangeLinkTestFixture requires ${ENV_RANGELINK_TEST_FIXTURES_ENABLED}=true`,
      functionName: 'markRangeLinkTestFixture',
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (terminal as any)[MARKER] = true;
};

/**
 * Returns `true` when a terminal was marked as a RangeLink test fixture.
 *
 * Returns `false` immediately (without touching the terminal object) when
 * the env var is not `'true'`, so production code pays only a single env-var
 * read.
 */
export const isRangeLinkTestFixture = (terminal: vscode.Terminal): boolean => {
  if (process.env[ENV_RANGELINK_TEST_FIXTURES_ENABLED] !== 'true') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (terminal as any)[MARKER] === true;
};
