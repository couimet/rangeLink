import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { RangeLinkTerminalLink } from '../types';

import { RangeLinkNavigationHandler } from './RangeLinkNavigationHandler';

/**
 * Terminal link provider for RangeLink format detection.
 *
 * Detects RangeLinks in terminal output and makes them clickable.
 *
 * **Supported formats:**
 * - Single line: `file.ts#L10`
 * - Multi-line: `file.ts#L10-L20`
 * - With columns: `file.ts#L10C5-L20C10`
 * - Rectangular: `file.ts##L10C5-L20C10`
 * - Hash in filename: `file#1.ts#L10`
 *
 * **Usage:**
 * ```typescript
 * const handler = new RangeLinkNavigationHandler(delimiters, logger);
 * const provider = new RangeLinkTerminalProvider(handler, logger);
 * context.subscriptions.push(
 *   vscode.window.registerTerminalLinkProvider(provider)
 * );
 * ```
 */
export class RangeLinkTerminalProvider
  implements vscode.TerminalLinkProvider<RangeLinkTerminalLink>
{
  /**
   * Create a new terminal link provider.
   *
   * @param handler - Navigation handler for link detection and navigation
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly handler: RangeLinkNavigationHandler,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'RangeLinkTerminalProvider.constructor' },
      'RangeLinkTerminalProvider initialized',
    );
  }

  /**
   * Detect RangeLinks in terminal output.
   *
   * Called by VS Code for each line of terminal output. Scans the line
   * for RangeLink patterns and returns link objects for each match.
   *
   * @param context - Terminal line context from VS Code
   * @param token - Cancellation token
   * @returns Array of detected terminal links
   */
  provideTerminalLinks(
    context: vscode.TerminalLinkContext,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<RangeLinkTerminalLink[]> {
    const line = context.line;
    const links: RangeLinkTerminalLink[] = [];

    // Get pattern from handler
    const pattern = this.handler.getPattern();

    // Reset regex lastIndex for global flag
    pattern.lastIndex = 0;

    // Find all matches in the line
    const matches = [...line.matchAll(pattern)];
    const totalMatches = matches.length;
    let parseFailures = 0;

    for (const match of matches) {
      if (token.isCancellationRequested) {
        break;
      }

      const fullMatch = match[0];
      const startIndex = match.index!;
      const length = fullMatch.length;

      // Parse the link to extract path and positions
      const parseResult = this.handler.parseLink(fullMatch);

      if (!parseResult.success) {
        parseFailures++;
        // Skip links that fail to parse - don't create clickable links for invalid syntax
        this.logger.debug(
          {
            fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
            link: fullMatch,
            error: parseResult.error, // Full error object with code, message, details
          },
          'Skipping link that failed to parse',
        );
        continue; // Skip this match
      }

      // Parse succeeded - create clickable link
      links.push({
        startIndex,
        length,
        tooltip: this.handler.formatTooltip(parseResult.value),
        data: fullMatch,
        parsed: parseResult.value,
      });
    }

    if (totalMatches > 0) {
      this.logger.debug(
        {
          fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
          lineLength: line.length,
          matchesFound: totalMatches,
          linksCreated: links.length,
          parseFailed: parseFailures,
        },
        'Processed RangeLink matches in terminal line',
      );
    }

    return links;
  }

  /**
   * Handle terminal link activation (click).
   *
   * Terminal-specific wrapper that adds:
   * - Single-position selection extension for visibility
   * - Custom feedback message with position formatting
   *
   * Delegates core navigation to handler.
   *
   * **Safety net:** While we only create links for successfully parsed RangeLinks
   * in provideTerminalLinks(), this validation acts as a defensive safety net
   * in case of future changes or bugs.
   *
   * @param link - The terminal link that was clicked
   */
  async handleTerminalLink(link: RangeLinkTerminalLink): Promise<void> {
    const linkText = link.data;
    const logCtx = { fn: 'RangeLinkTerminalProvider.handleTerminalLink', linkText };

    // Safety net: Validate link was successfully parsed
    // (Should never happen since provideTerminalLinks() filters these out,
    // but defensive programming prevents crashes if assumptions change)
    if (!link.parsed) {
      this.logger.warn(
        {
          ...logCtx,
          link,
        },
        'Terminal link clicked but parse data missing (safety net triggered)',
      );

      vscode.window.showWarningMessage(
        `RangeLink: Cannot navigate - invalid link format: ${linkText}`,
      );
      return;
    }

    try {
      // Delegate navigation to handler (shows success toast)
      await this.handler.navigateToLink(link.parsed, linkText);
    } catch (error) {
      // Handler already logged error and showed error message
      // Just log that terminal link handling failed
      this.logger.debug(
        { ...logCtx, error },
        'Terminal link handling completed with error (already handled by navigation handler)',
      );
    }
  }
}
