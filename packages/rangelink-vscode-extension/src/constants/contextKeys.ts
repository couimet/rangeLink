/**
 * Single source of truth for VSCode context keys used in `when` clauses.
 *
 * Context keys are set via `vscode.commands.executeCommand('setContext', key, value)`
 * and consumed in package.json `when` clauses for menu visibility, command enablement, etc.
 *
 * Keep entries sorted alphabetically by constant name.
 */

export const CONTEXT_TERMINAL_IS_BOUND = 'rangelink.terminalIsBound';

// Keep entries sorted alphabetically by constant name.
