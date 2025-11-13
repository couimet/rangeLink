import type { Logger } from 'barebone-logger';
import type { DelimiterConfig, ParsedLink, Result } from 'rangelink-core-ts';
import { buildLinkPattern, parseLink, RangeLinkError, SelectionType } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { convertRangeLinkPosition } from '../utils/convertRangeLinkPosition';
import { formatLinkPosition } from '../utils/formatLinkPosition';
import { formatLinkTooltip } from '../utils/formatLinkTooltip';
import { resolveWorkspacePath } from '../utils/resolveWorkspacePath';

/**
 * Core navigation handler for RangeLink format detection and navigation.
 *
 * Provides shared functionality for both terminal and document link providers:
 * - Pattern building and link detection
 * - Link parsing and validation
 * - Tooltip formatting
 * - File navigation with selection handling
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
 * const pattern = handler.getPattern();
 * const parseResult = handler.parseLink(linkText);
 * await handler.navigateToLink(parseResult.value, linkText);
 * ```
 */
export class RangeLinkNavigationHandler {
  private readonly pattern: RegExp;

  /**
   * Create a new navigation handler.
   *
   * @param delimiters - Delimiter configuration for link detection
   * @param ideAdapter - VSCode adapter for UI operations (notifications, document display)
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly delimiters: DelimiterConfig,
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {
    this.pattern = buildLinkPattern(delimiters);

    this.logger.debug(
      { fn: 'RangeLinkNavigationHandler.constructor', delimiters },
      'RangeLinkNavigationHandler initialized with delimiter config',
    );
  }

  /**
   * Get the compiled RegExp pattern for link detection.
   *
   * @returns RegExp pattern for matching RangeLinks
   */
  getPattern(): RegExp {
    return this.pattern;
  }

  /**
   * Parse a RangeLink string into structured data.
   *
   * Thin wrapper around core parseLink() for consistency and potential
   * future provider-specific parsing logic.
   *
   * @param linkText - Raw link text to parse
   * @returns Result with ParsedLink or RangeLinkError
   */
  parseLink(linkText: string): Result<ParsedLink, RangeLinkError> {
    return parseLink(linkText, this.delimiters);
  }

  /**
   * Format tooltip text for a parsed link.
   *
   * Thin wrapper around formatLinkTooltip() for consistency.
   *
   * @param parsed - Parsed link data
   * @returns Formatted tooltip string or undefined
   */
  formatTooltip(parsed: ParsedLink): string | undefined {
    return formatLinkTooltip(parsed);
  }

  /**
   * Navigate to a parsed RangeLink in VSCode editor.
   *
   * Core navigation logic extracted from both terminal and document providers.
   * Handles all selection types: single-line, range, columns, rectangular.
   *
   * @param parsed - Parsed link data with path and selection info
   * @param linkText - Original link text (for logging)
   * @returns Promise that resolves when navigation completes or rejects on error
   */
  async navigateToLink(parsed: ParsedLink, linkText: string): Promise<void> {
    const logCtx = { fn: 'RangeLinkNavigationHandler.navigateToLink', linkText };

    this.logger.info({ ...logCtx, parsed }, 'Navigating to RangeLink');

    const { path, start, end, selectionType } = parsed;

    // Resolve path to file URI (async)
    const fileUri = await resolveWorkspacePath(path);

    if (!fileUri) {
      this.logger.warn({ ...logCtx, path }, 'Failed to resolve workspace path');
      await this.ideAdapter.showWarningMessage(`RangeLink: Cannot find file: ${path}`);
      return;
    }

    try {
      // Open document and get editor
      const editor = await this.ideAdapter.showTextDocument(fileUri);

      // Convert positions (LinkPosition → ConvertedPosition → vscode.Position)
      const document = editor.document;
      const convertedStart = convertRangeLinkPosition(start, document);
      const convertedEnd = end ? convertRangeLinkPosition(end, document) : convertedStart;

      const vsStart = new vscode.Position(convertedStart.line, convertedStart.character);
      const vsEnd = new vscode.Position(convertedEnd.line, convertedEnd.character);

      // Handle rectangular mode (multi-cursor)
      if (selectionType === SelectionType.Rectangular) {
        const selections: vscode.Selection[] = [];
        for (let line = vsStart.line; line <= vsEnd.line; line++) {
          const lineStart = new vscode.Position(line, vsStart.character);
          const lineEnd = new vscode.Position(line, vsEnd.character);
          selections.push(new vscode.Selection(lineStart, lineEnd));
        }
        editor.selections = selections;

        this.logger.info(
          { ...logCtx, lineCount: selections.length },
          'Set rectangular selection (multi-cursor)',
        );
      } else {
        // Single or range selection
        const selection = new vscode.Selection(vsStart, vsEnd);
        editor.selection = selection;

        this.logger.info({ ...logCtx, selectionType }, 'Set selection');
      }

      // Reveal the selection
      editor.revealRange(
        new vscode.Range(vsStart, vsEnd),
        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
      );

      this.logger.info({ ...logCtx }, 'Navigation completed successfully');

      // Show success toast with formatted position
      const position = formatLinkPosition(start, end);
      await this.ideAdapter.showInformationMessage(`RangeLink: Navigated to ${path} @ ${position}`);
    } catch (error) {
      this.logger.error({ ...logCtx, error }, 'Navigation failed');
      await this.ideAdapter.showErrorMessage(
        `RangeLink: Failed to navigate to ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error; // Re-throw for caller to handle if needed
    }
  }
}
