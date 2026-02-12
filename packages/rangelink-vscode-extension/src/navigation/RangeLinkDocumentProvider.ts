import type { Logger } from 'barebone-logger';
import type { DelimiterConfigGetter } from 'rangelink-core-ts';
import { findLinksInText } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { RangeLinkClickArgs } from '../types';
import { formatLinkTooltip } from '../utils';

import { RangeLinkNavigationHandler } from './RangeLinkNavigationHandler';

/**
 * Document link provider for RangeLink format detection in editor files.
 *
 * Makes RangeLinks clickable in editor files (markdown, text, code, untitled, notebook cells).
 * Primary use case: Validating links in scratchpad files before pasting to claude-code.
 *
 * **Supported formats:**
 * - Single line: `file.ts#L10`
 * - Multi-line: `file.ts#L10-L20`
 * - With columns: `file.ts#L10C5-L20C10`
 * - Rectangular: `file.ts##L10C5-L20C10`
 * - Hash in filename: `file#1.ts#L10`
 *
 * **Important:** Do NOT register for all schemes (`{ scheme: '*' }`). This causes infinite
 * recursion when the provider scans output channels containing its own logs. Explicitly
 * register only for desired schemes: `file`, `untitled`.
 */
export class RangeLinkDocumentProvider implements vscode.DocumentLinkProvider {
  /**
   * Create a new document link provider.
   *
   * @param handler - Navigation handler for link navigation
   * @param getDelimiters - Factory function for fresh delimiter configuration
   * @param ideAdapter - VSCode adapter for IDE operations
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly handler: RangeLinkNavigationHandler,
    private readonly getDelimiters: DelimiterConfigGetter,
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'RangeLinkDocumentProvider.constructor' },
      'RangeLinkDocumentProvider initialized',
    );
  }

  /**
   * Detect RangeLinks in editor documents.
   *
   * Called by VS Code when document is opened or changed. Scans the document
   * for RangeLink patterns and returns link objects for each match.
   *
   * @param document - The document to scan for links
   * @param token - Cancellation token
   * @returns Array of detected document links
   */
  provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const text = document.getText();
    const detectedLinks = findLinksInText(text, this.getDelimiters(), this.logger, token);

    this.logger.debug(
      {
        fn: 'RangeLinkDocumentProvider.provideDocumentLinks',
        documentUri: document.uri.toString(),
        linksFound: detectedLinks.length,
      },
      `Found ${detectedLinks.length} RangeLinks in document`,
    );

    return detectedLinks.map(({ linkText, startIndex, length, parsed }) => {
      const startPos = document.positionAt(startIndex);
      const endPos = document.positionAt(startIndex + length);
      const range = this.ideAdapter.createRange(startPos, endPos);

      const docLink = new vscode.DocumentLink(range);
      docLink.tooltip = formatLinkTooltip(parsed);
      docLink.target = this.ideAdapter.parseUri(
        `command:rangelink.handleDocumentLinkClick?${encodeURIComponent(JSON.stringify({ linkText, parsed }))}`,
      );

      return docLink;
    });
  }

  /**
   * Handle link click navigation (instance method).
   * This is called via the command registered in extension.ts.
   *
   * Delegates navigation to the handler.
   *
   * @param args - Common click arguments (linkText and parsed data)
   */
  async handleLinkClick(args: RangeLinkClickArgs): Promise<void> {
    const { linkText, parsed } = args;
    const logCtx = { fn: 'RangeLinkDocumentProvider.handleLinkClick', linkText };

    this.logger.debug({ ...logCtx, parsed }, 'Document link clicked - delegating to handler');

    try {
      await this.handler.navigateToLink(parsed, linkText);
    } catch (error) {
      this.logger.debug(
        { ...logCtx, error },
        'Document link handling completed with error (already handled by navigation handler)',
      );
    }
  }
}
