import type { Logger } from 'barebone-logger';
import type { DelimiterConfigGetter } from 'rangelink-core-ts';
import { buildFilePathPattern, extractFilePath } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { CMD_HANDLE_FILE_PATH_CLICK } from '../constants/commandIds';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { FilePathClickArgs } from '../types';
import { MessageCode } from '../types';
import { formatMessage } from '../utils';

import type { FilePathNavigationHandler } from './FilePathNavigationHandler';

/**
 * Document link provider for plain file path detection in editor files.
 *
 * Makes plain file paths clickable in editor documents (markdown, text, code, untitled).
 * Delegates navigation to FilePathNavigationHandler on click.
 *
 * **Supported formats:**
 * - Double-quoted: `"/path/with spaces/file.ts"`
 * - Single-quoted: `'/path/to/file.ts'`
 * - Absolute: `/path/to/file.ts`
 * - Relative: `./file.ts`, `../file.ts`
 * - Tilde: `~/file.ts`
 *
 * **Important:** Do NOT register for all schemes (`{ scheme: '*' }`). This causes infinite
 * recursion when the provider scans output channels containing its own logs. Explicitly
 * register only for desired schemes: `file`, `untitled`.
 */
export class FilePathDocumentProvider implements vscode.DocumentLinkProvider {
  /**
   * Create a new file path document link provider.
   *
   * @param handler - Navigation handler for file path navigation
   * @param ideAdapter - VSCode adapter for IDE operations
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly getDelimiters: DelimiterConfigGetter,
    private readonly handler: FilePathNavigationHandler,
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'FilePathDocumentProvider.constructor' },
      'FilePathDocumentProvider initialized',
    );
  }

  /**
   * Detect plain file paths in editor documents.
   *
   * Called by VS Code when a document is opened or changed. Scans the document
   * text for file path patterns and returns link objects for each match.
   *
   * @param document - The document to scan for file paths
   * @returns Array of detected document links
   */
  provideDocumentLinks(
    document: vscode.TextDocument,
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const text = document.getText();
    const pattern = buildFilePathPattern(this.getDelimiters());
    const links: vscode.DocumentLink[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const rawPath = extractFilePath(match);
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = this.ideAdapter.createRange(startPos, endPos);

      const docLink = new vscode.DocumentLink(range);
      docLink.tooltip = formatMessage(MessageCode.TOOLTIP_FILE_PATH, { path: rawPath });
      docLink.target = this.ideAdapter.parseUri(
        `command:${CMD_HANDLE_FILE_PATH_CLICK}?${encodeURIComponent(JSON.stringify({ filePath: rawPath }))}`,
      );

      links.push(docLink);
    }

    this.logger.debug(
      {
        fn: 'FilePathDocumentProvider.provideDocumentLinks',
        documentUri: document.uri.toString(),
        linksFound: links.length,
      },
      `Found ${links.length} file paths in document`,
    );

    return links;
  }

  /**
   * Handle link click navigation (instance method).
   * Called via the command registered in extension.ts.
   *
   * Delegates navigation to the handler. Errors are surfaced to the user
   * by the handler itself.
   *
   * @param args - Click arguments containing the raw file path
   */
  async handleLinkClick(args: FilePathClickArgs): Promise<void> {
    const logCtx = { fn: 'FilePathDocumentProvider.handleLinkClick', filePath: args.filePath };

    this.logger.debug({ ...logCtx }, 'Document link clicked - delegating to handler');

    try {
      await this.handler.navigateToFile(args.filePath);
    } catch (error) {
      this.logger.debug(
        { ...logCtx, error },
        'Document link handling completed with error (already handled by navigation handler)',
      );
    }
  }
}
