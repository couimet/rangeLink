import type { Logger } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { RangeLinkClickArgs } from '../types';
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
 *
 * **Usage:**
 * ```typescript
 * const handler = new RangeLinkNavigationHandler(delimiters, logger);
 * const provider = new RangeLinkDocumentProvider(handler, logger);
 * context.subscriptions.push(
 *   vscode.languages.registerDocumentLinkProvider(
 *     [
 *       { scheme: 'file' },
 *       { scheme: 'untitled' }
 *     ],
 *     provider
 *   )
 * );
 * ```
 */
export class RangeLinkDocumentProvider implements vscode.DocumentLinkProvider {
  /**
   * Create a new document link provider.
   *
   * @param handler - Navigation handler for link detection and navigation
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly handler: RangeLinkNavigationHandler,
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
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    // Get pattern from handler
    const pattern = this.handler.getPattern();

    // Reset regex lastIndex for global flag
    pattern.lastIndex = 0;

    // Find all matches in the document
    const matches = [...text.matchAll(pattern)];

    for (const match of matches) {
      if (token.isCancellationRequested) {
        break;
      }

      const linkText = match[0];
      const startIndex = match.index!;
      const endIndex = startIndex + linkText.length;

      // Convert string indices to document positions
      const startPos = document.positionAt(startIndex);
      const endPos = document.positionAt(endIndex);
      const range = new vscode.Range(startPos, endPos);

      // Parse the link
      const parseResult = this.handler.parseLink(linkText);

      if (!parseResult.success) {
        // Skip invalid links
        this.logger.debug(
          {
            fn: 'RangeLinkDocumentProvider.provideDocumentLinks',
            linkText,
            error: parseResult.error,
          },
          'Skipping invalid link',
        );
        continue;
      }

      const parsed = parseResult.value;

      // Create document link with custom command
      const docLink = new vscode.DocumentLink(range);

      // Reuse formatLinkTooltip utility (DRY - same as terminal provider)
      docLink.tooltip = this.handler.formatTooltip(parsed);

      // Create command URI that will trigger navigation
      docLink.target = vscode.Uri.parse(
        `command:rangelink.handleDocumentLinkClick?${encodeURIComponent(JSON.stringify({ linkText, parsed }))}`,
      );

      links.push(docLink);
    }

    this.logger.debug(
      {
        fn: 'RangeLinkDocumentProvider.provideDocumentLinks',
        documentUri: document.uri.toString(),
        linksFound: links.length,
      },
      `Found ${links.length} RangeLinks in document`,
    );

    return links;
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

    // Delegate to handler
    await this.handler.navigateToLink(parsed, linkText);
  }
}
