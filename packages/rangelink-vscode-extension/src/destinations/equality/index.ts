/**
 * Barrel export for destination equality utilities.
 *
 * Equality utilities enable comparing destinations by their underlying resources:
 * - compareTerminalsByProcessId: Compare terminals by process ID
 * - compareEditorsByUri: Compare editors by document URI
 */

export { compareTerminalsByProcessId } from './compareTerminalsByProcessId';
export { compareEditorsByUri } from './compareEditorsByUri';
