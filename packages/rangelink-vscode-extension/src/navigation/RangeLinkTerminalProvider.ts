import type { Logger } from 'barebone-logger';
import type { DelimiterConfigGetter } from 'rangelink-core-ts';
import { findLinksInText } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode, type RangeLinkTerminalLink } from '../types';
import { formatLinkTooltip, formatMessage } from '../utils';

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
 */
export class RangeLinkTerminalProvider
  implements vscode.TerminalLinkProvider<RangeLinkTerminalLink>
{
  /**
   * Create a new terminal link provider.
   *
   * @param handler - Navigation handler for link navigation
   * @param getDelimiters - Factory function for fresh delimiter configuration
   * @param ideAdapter - VSCode adapter for UI operations (warnings)
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly handler: RangeLinkNavigationHandler,
    private readonly getDelimiters: DelimiterConfigGetter,
    private readonly ideAdapter: VscodeAdapter,
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
    const detectedLinks = findLinksInText(context.line, this.getDelimiters(), this.logger, token);

    this.logger.debug(
      {
        fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
        lineLength: context.line.length,
        linksFound: detectedLinks.length,
      },
      'Scanned terminal line for RangeLinks',
    );

    return detectedLinks.map(({ linkText, startIndex, length, parsed }) => ({
      startIndex,
      length,
      tooltip: formatLinkTooltip(parsed),
      data: linkText,
      parsed,
    }));
  }

  /**
   * Handle terminal link activation (click).
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

    if (!link.parsed) {
      this.logger.warn(
        {
          ...logCtx,
          link,
        },
        'Terminal link clicked but parse data missing (safety net triggered)',
      );

      await this.ideAdapter.showWarningMessage(
        formatMessage(MessageCode.ERROR_TERMINAL_LINK_INVALID_FORMAT, { linkText }),
      );
      return;
    }

    try {
      await this.handler.navigateToLink(link.parsed, linkText);
    } catch (error) {
      this.logger.debug(
        { ...logCtx, error },
        'Terminal link handling completed with error (already handled by navigation handler)',
      );
    }
  }
}
