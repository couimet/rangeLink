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

/**
 * When `'true'`, running in a real Extension Development Host for development
 * tests. `activate()` loads the development-test runner from
 * `out/__development-tests__` (kept out of the shipped VSIX) so it can drive
 * real commands that the test host cannot exercise (e.g. modal-dialog keyboard
 * focus, which the test host refuses to render).
 */
export const ENV_RANGELINK_DEVELOPMENT = 'RANGELINK_DEVELOPMENT';

/**
 * Scenario ID to run, read by the development-test runner
 * (e.g. `dirty-buffer-warning-024`). Always set by the driver script
 * (`run-development-tests.sh`) — there is no default; an unset value is a FAIL.
 */
export const ENV_RANGELINK_DEVELOPMENT_SCENARIO = 'RANGELINK_DEVELOPMENT_SCENARIO';

/**
 * Absolute path to the JSONL report file the development-test runner appends
 * PASS/FAIL results to. Set by the driver script (`run-development-tests.sh`).
 */
export const ENV_RANGELINK_DEVELOPMENT_REPORT = 'RANGELINK_DEVELOPMENT_REPORT';

/**
 * When `'true'`, running under the VS Code extension test host, which refuses
 * to render modal dialogs (`DialogService` guard). `VscodeAdapter` falls back
 * to a plain warning toast so integration tests can drive the dialog.
 */
export const ENV_RANGELINK_TEST_HOST = 'RANGELINK_TEST_HOST';
