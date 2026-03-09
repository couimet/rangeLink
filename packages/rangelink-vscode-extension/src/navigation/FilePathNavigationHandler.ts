import os from 'node:os';

import type { Logger } from 'barebone-logger';
import { buildFilePathPattern, extractFilePath } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types';
import { formatMessage } from '../utils';

export { buildFilePathPattern, extractFilePath };

/**
 * Navigation handler for plain file path navigation.
 *
 * Handles VSCode-specific navigation for plain file paths (without RangeLink `#L` suffix).
 * Path detection is delegated to buildFilePathPattern() from rangelink-core-ts which reuses
 * the same URL exclusion strategy as RangeLink detection. Validates file existence on click
 * for performance — not during detection.
 */
export class FilePathNavigationHandler {
  /**
   * Create a new file path navigation handler.
   *
   * @param ideAdapter - VSCode adapter providing complete VSCode API facade
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'FilePathNavigationHandler.constructor' },
      'FilePathNavigationHandler initialized',
    );
  }

  /**
   * Navigate to a file path in VSCode editor.
   *
   * Expands tilde paths, resolves the path to a URI, opens the file,
   * and shows user-facing feedback on success or failure.
   *
   * Validate-on-click: file existence is only checked here, not during detection.
   *
   * @param rawPath - The file path string to navigate to (without surrounding quotes)
   */
  async navigateToFile(rawPath: string): Promise<void> {
    const logCtx = { fn: 'FilePathNavigationHandler.navigateToFile', rawPath };

    this.logger.info({ ...logCtx }, 'Navigating to file path');

    const expandedPath = rawPath.startsWith('~/')
      ? os.homedir() + rawPath.slice(1)
      : rawPath;

    const fileUri = await this.ideAdapter.resolveWorkspacePath(expandedPath);

    if (!fileUri) {
      this.logger.warn({ ...logCtx, expandedPath }, 'Cannot resolve file path');
      await this.ideAdapter.showWarningMessage(
        formatMessage(MessageCode.WARN_FILE_PATH_NOT_FOUND, { path: rawPath }),
      );
      return;
    }

    try {
      await this.ideAdapter.showTextDocument(fileUri);
      this.logger.info({ ...logCtx }, 'Navigation completed successfully');
    } catch (error) {
      this.logger.error({ ...logCtx, error }, 'Navigation failed');
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_FILE_PATH_NAVIGATION_FAILED, {
          path: rawPath,
          error: errorMessage,
        }),
      );
      throw error;
    }
  }
}
