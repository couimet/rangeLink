/**
 * Barrel export for destination equality utilities.
 *
 * Equality utilities enable comparing destinations by their underlying resources:
 * - compareTerminalsByProcessId: Compare terminals by process ID
 * - compareEditorsByUri: Compare editors by document URI
 */

export * from './compareEditorsByUri';
export * from './compareTerminalsByProcessId';
