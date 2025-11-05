import type { DelimiterConfig, Logger, ParsedLink } from 'rangelink-core-ts';
import { buildLinkPattern, parseLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { RangeLinkTerminalLink } from '../types';
import { formatLinkPosition } from '../utils/formatLinkPosition';
import { formatLinkTooltip } from '../utils/formatLinkTooltip';

/**
 * Terminal link provider for RangeLink format detection.
 *
 * Detects RangeLinks in terminal output and makes them clickable.
 * Currently detects links and shows feedback - navigation will be
 * implemented in later subsets.
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
 * const provider = new RangeLinkTerminalProvider(delimiters, logger);
 * context.subscriptions.push(
 *   vscode.window.registerTerminalLinkProvider(provider)
 * );
 * ```
 */
export class RangeLinkTerminalProvider
  implements vscode.TerminalLinkProvider<RangeLinkTerminalLink>
{
  private readonly pattern: RegExp;

  /**
   * Create a new terminal link provider.
   *
   * @param delimiters - Delimiter configuration for link detection
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly delimiters: DelimiterConfig,
    private readonly logger: Logger,
  ) {
    this.pattern = buildLinkPattern(delimiters);

    this.logger.debug(
      { fn: 'RangeLinkTerminalProvider.constructor', delimiters },
      'RangeLinkTerminalProvider initialized with delimiter config',
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

    // Reset regex lastIndex for global flag
    this.pattern.lastIndex = 0;

    // Find all matches in the line
    const matches = [...line.matchAll(this.pattern)];

    for (const match of matches) {
      if (token.isCancellationRequested) {
        break;
      }

      const fullMatch = match[0];
      const startIndex = match.index!;
      const length = fullMatch.length;

      // Parse the link to extract path and positions
      const parseResult = parseLink(fullMatch, this.delimiters);

      let parsed: ParsedLink | undefined;
      if (parseResult.success) {
        parsed = parseResult.value;
      } else {
        // Log parse failure but still create clickable link
        this.logger.debug(
          {
            fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
            link: fullMatch,
            error: parseResult.error, // Full error object with code, message, details
          },
          'Failed to parse detected link',
        );
      }

      links.push({
        startIndex,
        length,
        tooltip: formatLinkTooltip(parsed),
        data: fullMatch,
        parsed,
      });
    }

    if (links.length > 0) {
      const parsedCount = links.filter(l => l.parsed).length;
      this.logger.debug(
        {
          fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
          lineLength: line.length,
          linksDetected: links.length,
          parsedSuccessfully: parsedCount,
          parseFailed: links.length - parsedCount,
        },
        'Detected RangeLinks in terminal line',
      );
    }

    return links;
  }

  /**
   * Handle terminal link activation (click).
   *
   * Currently shows an information message with parsed data.
   * Navigation will be implemented in Subset 5.
   *
   * @param link - The terminal link that was clicked
   */
  handleTerminalLink(link: RangeLinkTerminalLink): vscode.ProviderResult<void> {
    const linkText = link.data;

    if (link.parsed) {
      const { path, start, end, selectionType } = link.parsed;

      this.logger.info(
        {
          fn: 'RangeLinkTerminalProvider.handleTerminalLink',
          link: linkText,
          parsed: link.parsed,
        },
        'Terminal link clicked (parsed successfully)',
      );

      const position = formatLinkPosition(start, end);

      vscode.window.showInformationMessage(
        `RangeLink: ${path} @ ${position} [${selectionType}]`,
      );
    } else {
      this.logger.warn(
        {
          fn: 'RangeLinkTerminalProvider.handleTerminalLink',
          link: linkText,
        },
        'Terminal link clicked but parse failed',
      );

      vscode.window.showWarningMessage(
        `RangeLink detected but failed to parse: ${linkText}`,
      );
    }
  }
}
