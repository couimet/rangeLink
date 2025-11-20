import type { Logger } from 'barebone-logger';
import type { DelimiterConfig, ParsedLink, Result } from 'rangelink-core-ts';
import { buildLinkPattern, parseLink, RangeLinkError, SelectionType } from 'rangelink-core-ts';
import type * as vscode from 'vscode';
import { TextEditorRevealType } from 'vscode';

import { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { convertRangeLinkPosition } from '../utils/convertRangeLinkPosition';
import { formatLinkPosition } from '../utils/formatLinkPosition';
import { formatLinkTooltip } from '../utils/formatLinkTooltip';
import { formatMessage } from '../utils/formatMessage';

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
   * @param ideAdapter - VSCode adapter providing complete VSCode API facade
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
    let fileUri = await this.ideAdapter.resolveWorkspacePath(path);

    if (!fileUri) {
      this.logger.warn({ ...logCtx, path }, 'Failed to resolve workspace path');

      // Issue #16: Provide better error message for untitled files
      // If path looks like an untitled file (Untitled-1, Untitled-2, etc.) AND doesn't resolve,
      // try to find it among open untitled documents before showing error
      const looksLikeUntitled = /^Untitled-?\d*$/i.test(path);
      if (looksLikeUntitled) {
        const untitledUri = this.ideAdapter.findOpenUntitledFile(path);

        if (untitledUri) {
          this.logger.info(
            { ...logCtx, path, uri: untitledUri.toString() },
            'Found open untitled file, navigating',
          );
          fileUri = untitledUri;
        } else {
          // Ultimate last resort: not saved AND not currently open
          this.logger.info(
            { ...logCtx, path },
            'Path looks like untitled file but not found in open documents',
          );
          await this.ideAdapter.showWarningMessage(
            formatMessage(MessageCode.WARN_NAVIGATION_UNTITLED_FILE, { path }),
          );
          return;
        }
      } else {
        await this.ideAdapter.showWarningMessage(
          formatMessage(MessageCode.WARN_NAVIGATION_FILE_NOT_FOUND, { path }),
        );
        return;
      }
    }

    try {
      // Open document and get editor
      const editor = await this.ideAdapter.showTextDocument(fileUri);

      // Convert positions (LinkPosition → ConvertedPosition → vscode.Position)
      const document = editor.document;
      const convertedStart = convertRangeLinkPosition(start, document);
      const convertedEnd = end ? convertRangeLinkPosition(end, document) : convertedStart;

      let vsStart = this.ideAdapter.createPosition(convertedStart.line, convertedStart.character);
      let vsEnd = this.ideAdapter.createPosition(convertedEnd.line, convertedEnd.character);

      // Single-position selection extension for visibility
      // When navigating to a single position (e.g., file.ts#L32C1), extend the selection
      // by 1 character to make it visible. Without this, users see only an invisible cursor.
      if (vsStart.line === vsEnd.line && vsStart.character === vsEnd.character) {
        const lineLength = document.lineAt(vsStart.line).text.length;

        if (lineLength > 0 && vsStart.character < lineLength) {
          // Normal case: Extend by 1 character for visibility
          vsEnd = this.ideAdapter.createPosition(vsEnd.line, vsEnd.character + 1);

          this.logger.debug(
            {
              ...logCtx,
              originalPos: `${vsStart.line + 1}:${vsStart.character + 1}`,
              extendedTo: `${vsEnd.line + 1}:${vsEnd.character + 1}`,
              reason: 'single-position selection needs visibility',
            },
            'Extended single-position selection by 1 character',
          );
        } else {
          // Edge case: Empty line or end of line - keep cursor only
          this.logger.debug(
            {
              ...logCtx,
              position: `${vsStart.line + 1}:${vsStart.character + 1}`,
              lineLength,
              reason: lineLength === 0 ? 'empty line' : 'end of line',
            },
            'Single-position selection at line boundary - keeping cursor only',
          );
        }
      }

      // Handle rectangular mode (multi-cursor)
      if (selectionType === SelectionType.Rectangular) {
        const selections: vscode.Selection[] = [];
        for (let line = vsStart.line; line <= vsEnd.line; line++) {
          const lineStart = this.ideAdapter.createPosition(line, vsStart.character);
          const lineEnd = this.ideAdapter.createPosition(line, vsEnd.character);
          selections.push(this.ideAdapter.createSelection(lineStart, lineEnd));
        }
        editor.selections = selections;

        this.logger.info(
          { ...logCtx, lineCount: selections.length },
          'Set rectangular selection (multi-cursor)',
        );
      } else {
        // Single or range selection
        const selection = this.ideAdapter.createSelection(vsStart, vsEnd);
        editor.selection = selection;

        this.logger.info({ ...logCtx, selectionType }, 'Set selection');
      }

      // Reveal the selection
      editor.revealRange(
        this.ideAdapter.createRange(vsStart, vsEnd),
        TextEditorRevealType.InCenterIfOutsideViewport,
      );

      this.logger.info({ ...logCtx }, 'Navigation completed successfully');

      // Show success toast with formatted position
      const position = formatLinkPosition(start, end);
      await this.ideAdapter.showInformationMessage(
        formatMessage(MessageCode.INFO_NAVIGATION_SUCCESS, { path, position }),
      );
    } catch (error) {
      this.logger.error({ ...logCtx, error }, 'Navigation failed');
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_NAVIGATION_FAILED, { path, error: errorMessage }),
      );
      throw error; // Re-throw for caller to handle if needed
    }
  }
}
