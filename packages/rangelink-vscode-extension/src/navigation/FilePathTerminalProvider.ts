import type { Logger } from 'barebone-logger';
import { buildFilePathPattern, extractFilePath } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { FilePathTerminalLink } from '../types';
import { MessageCode } from '../types';
import { formatMessage } from '../utils';

import type { FilePathNavigationHandler } from './FilePathNavigationHandler';

/**
 * Terminal link provider for plain file path detection.
 *
 * Detects plain file paths in terminal output and makes them clickable.
 * Delegates navigation to FilePathNavigationHandler on click.
 *
 * **Supported formats:**
 * - Double-quoted: `"/path/with spaces/file.ts"`
 * - Single-quoted: `'/path/to/file.ts'`
 * - Absolute: `/path/to/file.ts`
 * - Relative: `./file.ts`, `../file.ts`
 * - Tilde: `~/file.ts`
 */
export class FilePathTerminalProvider implements vscode.TerminalLinkProvider<FilePathTerminalLink> {
  /**
   * Create a new file path terminal link provider.
   *
   * @param handler - Navigation handler for file path navigation
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly handler: FilePathNavigationHandler,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'FilePathTerminalProvider.constructor' },
      'FilePathTerminalProvider initialized',
    );
  }

  /**
   * Detect plain file paths in terminal output.
   *
   * Called by VS Code for each line of terminal output. Scans the line
   * for file path patterns and returns link objects for each match.
   *
   * @param context - Terminal line context from VS Code
   * @returns Array of detected terminal links
   */
  provideTerminalLinks(
    context: vscode.TerminalLinkContext,
  ): vscode.ProviderResult<FilePathTerminalLink[]> {
    const pattern = buildFilePathPattern();
    const links: FilePathTerminalLink[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(context.line)) !== null) {
      const rawPath = extractFilePath(match);
      links.push({
        startIndex: match.index,
        length: match[0].length,
        tooltip: formatMessage(MessageCode.TOOLTIP_FILE_PATH, { path: rawPath }),
        data: rawPath,
      });
    }

    this.logger.debug(
      {
        fn: 'FilePathTerminalProvider.provideTerminalLinks',
        lineLength: context.line.length,
        linksFound: links.length,
      },
      'Scanned terminal line for file paths',
    );

    return links;
  }

  /**
   * Handle terminal link activation (click).
   *
   * Delegates navigation to handler. Errors are surfaced to the user
   * by the handler itself.
   *
   * @param link - The terminal link that was clicked
   */
  async handleTerminalLink(link: FilePathTerminalLink): Promise<void> {
    try {
      await this.handler.navigateToFile(link.data);
    } catch (error) {
      this.logger.debug(
        { fn: 'FilePathTerminalProvider.handleTerminalLink', error },
        'Terminal link handling completed with error (already handled by navigation handler)',
      );
    }
  }
}
