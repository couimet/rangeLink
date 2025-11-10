import { getLogger } from 'barebone-logger';
import { type DelimiterConfig } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { loadDelimiterConfig } from './loadDelimiterConfig';

/**
 * Loads delimiter configuration from VSCode workspace settings.
 *
 * Handles VSCode-specific concerns:
 * - Adapts VSCode WorkspaceConfiguration to ConfigGetter interface
 * - Shows error notification if configuration is invalid
 * - Returns default delimiters on error (never throws)
 *
 * @returns DelimiterConfig - validated delimiters (defaults if invalid)
 */
export const getDelimitersForExtension = (): DelimiterConfig => {
  const vscodeConfig = vscode.workspace.getConfiguration('rangelink');
  const logger = getLogger();

  // Adapt VSCode WorkspaceConfiguration to ConfigGetter interface
  // VSCode's inspect() returns extra language-specific fields we don't need
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = vscodeConfig as any;

  const result = loadDelimiterConfig(config, logger);

  // Extension-specific: Show error notification if there were errors
  if (result.errors.length > 0) {
    vscode.window.showErrorMessage(
      `RangeLink: Invalid delimiter configuration. Using defaults. Check Output → RangeLink for details.`,
    );
  }

  return result.delimiters;
};
