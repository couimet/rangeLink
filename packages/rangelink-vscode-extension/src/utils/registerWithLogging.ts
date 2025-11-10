import { getLogger } from 'barebone-logger';
import * as vscode from 'vscode';

/**
 * Wraps VSCode registration calls with logging.
 *
 * Logs successful registration at DEBUG level, making activation
 * easier to trace without cluttering the main extension code.
 *
 * @param disposable - The VSCode disposable to register (provider, command, etc.)
 * @param message - Human-readable description of what was registered
 * @returns The disposable (for fluent chaining if needed)
 */
export const registerWithLogging = <T extends vscode.Disposable>(disposable: T, message: string): T => {
  getLogger().debug({ fn: 'activate' }, message);
  return disposable;
};
