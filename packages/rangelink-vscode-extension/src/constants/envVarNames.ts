/**
 * Centralized environment-variable names used to toggle test-only code paths
 * in production modules. Each constant value is the literal env-var name —
 * importers read or write `process.env[ENV_RANGELINK_*]` so the name lives in
 * exactly one place.
 *
 * The `.vscode-test.base.mjs` runner config sets these before launching VS
 * Code; integration tests then observe them. Production code reads them at
 * module load (see `LogCapture` and `VscodeAdapter.showQuickPick`'s items
 * projection) or per-call (see `testFixtureRegistry`).
 */

/**
 * When `'true'`, enables in-memory log capture in `LogCapture` and the
 * test-only enrichment of `VscodeAdapter.showQuickPick` log entries with flat
 * `isActive` / `boundState` fields sourced from `terminalInfo` / `fileInfo`.
 */
export const ENV_RANGELINK_CAPTURE_LOGS = 'RANGELINK_CAPTURE_LOGS';

/**
 * When `'true'`, lets integration tests register a marker on a terminal so
 * `classifyTerminalForBinding` treats it as a normal bindable terminal.
 */
export const ENV_RANGELINK_TEST_FIXTURES_ENABLED = 'RANGELINK_TEST_FIXTURES_ENABLED';
