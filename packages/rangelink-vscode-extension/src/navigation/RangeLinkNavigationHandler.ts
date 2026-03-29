import type { Logger } from 'barebone-logger';
import type { CoreResult, DelimiterConfigGetter, ParsedLink } from 'rangelink-core-ts';
import { SelectionType, parseLink } from 'rangelink-core-ts';
import type * as vscode from 'vscode';
import { TextEditorRevealType } from 'vscode';

import type { ConfigReader } from '../config/ConfigReader';
import {
  DEFAULT_NAVIGATION_SHOW_CLAMPING_WARNING,
  DEFAULT_NAVIGATION_SHOW_NAVIGATED_TOAST,
} from '../constants/settingDefaults';
import {
  SETTING_NAVIGATION_SHOW_CLAMPING_WARNING,
  SETTING_NAVIGATION_SHOW_NAVIGATED_TOAST,
} from '../constants/settingKeys';
import { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { FILENAME_AMBIGUOUS, MessageCode } from '../types';
import {
  convertRangeLinkPosition,
  formatClampingSummary,
  formatLinkPosition,
  formatMessage,
} from '../utils';

/**
 * Navigation handler for RangeLink file navigation.
 *
 * Handles VSCode-specific navigation:
 * - File resolution and opening
 * - Selection positioning (single, range, rectangular)
 * - User feedback (messages, reveal in editor)
 */
export class RangeLinkNavigationHandler {
  /**
   * Create a new navigation handler.
   *
   * @param getDelimiters - Factory function for fresh delimiter configuration
   * @param ideAdapter - VSCode adapter providing complete VSCode API facade
   * @param configReader - Configuration reader for navigation settings
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly getDelimiters: DelimiterConfigGetter,
    private readonly ideAdapter: VscodeAdapter,
    private readonly configReader: ConfigReader,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'RangeLinkNavigationHandler.constructor' },
      'RangeLinkNavigationHandler initialized',
    );
  }

  /**
   * Parse a RangeLink string into structured data.
   *
   * @param linkText - Raw link text to parse
   */
  parseLink(linkText: string): CoreResult<ParsedLink> {
    return parseLink(linkText, this.getDelimiters());
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
    const resolved = await this.ideAdapter.resolveWorkspacePath(path);

    if (resolved === FILENAME_AMBIGUOUS) {
      this.logger.warn({ ...logCtx, path }, 'Multiple files match bare filename');
      await this.ideAdapter.showWarningMessage(
        formatMessage(MessageCode.WARN_NAVIGATION_FILENAME_AMBIGUOUS, { path }),
      );
      return;
    }

    let fileUri = resolved?.uri;

    if (resolved) {
      this.logger.debug({ ...logCtx, path, resolvedVia: resolved.resolvedVia }, 'Path resolved');
    }

    // Issue #101: When path doesn't resolve on disk, check open untitled documents.
    // Uses URI scheme (untitled:) not filename patterns, so works in all locales.
    if (!fileUri) {
      this.logger.warn({ ...logCtx, path }, 'Failed to resolve workspace path');

      const untitledUri = this.ideAdapter.findOpenUntitledFile(path);

      if (untitledUri) {
        this.logger.info(
          { ...logCtx, path, uri: untitledUri.toString() },
          'Found open untitled file, navigating',
        );
        fileUri = untitledUri;
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

      // Detect full-line selection: both start.character and end.character are undefined
      // This distinguishes #L10 (full line) from #L10C1 (explicit point)
      const isFullLineSelection = start.character === undefined && end.character === undefined;

      const convertedStart = convertRangeLinkPosition(start, document);
      const convertedEnd = convertRangeLinkPosition(end, document);

      const anyClamping =
        convertedStart.lineClamped ||
        convertedStart.characterClamped ||
        convertedEnd.lineClamped ||
        convertedEnd.characterClamped;

      if (anyClamping) {
        this.logger.warn(
          {
            ...logCtx,
            requestedStart: { line: start.line, character: start.character },
            actualStart: { line: convertedStart.line + 1, character: convertedStart.character + 1 },
            startClamping: {
              line: convertedStart.lineClamped,
              character: convertedStart.characterClamped,
            },
            requestedEnd: { line: end.line, character: end.character },
            actualEnd: { line: convertedEnd.line + 1, character: convertedEnd.character + 1 },
            endClamping: {
              line: convertedEnd.lineClamped,
              character: convertedEnd.characterClamped,
            },
          },
          'Position clamped to document bounds',
        );
      }

      let vsStart = this.ideAdapter.createPosition(convertedStart.line, convertedStart.character);
      let vsEnd: ReturnType<typeof this.ideAdapter.createPosition>;

      if (isFullLineSelection) {
        // Full-line selection: extend end to line length
        // For empty lines, both start and end will be at character 0 (the full empty line)
        const endLineLength = document.lineAt(convertedEnd.line).text.length;
        vsEnd = this.ideAdapter.createPosition(convertedEnd.line, endLineLength);

        this.logger.debug(
          {
            ...logCtx,
            startLine: convertedStart.line + 1,
            endLine: convertedEnd.line + 1,
            endLineLength,
            reason: 'full-line selection detected',
          },
          'Extended selection to full line(s)',
        );
      } else {
        // Explicit position selection (e.g., #L10C5 or #L10C5-L20C10)
        vsEnd = this.ideAdapter.createPosition(convertedEnd.line, convertedEnd.character);

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

      this.logger.info(
        {
          ...logCtx,
          finalSelection: {
            anchorLine: vsStart.line,
            anchorChar: vsStart.character,
            activeLine: vsEnd.line,
            activeChar: vsEnd.character,
          },
        },
        'Navigation completed successfully',
      );

      const position = formatLinkPosition(start, end);

      if (anyClamping) {
        const clampingSummary = formatClampingSummary(convertedStart, convertedEnd);
        const clampingMessage = formatMessage(MessageCode.WARN_NAVIGATION_CLAMPED, {
          path,
          position,
          clampingSummary,
        });
        if (
          this.configReader.getBoolean(
            SETTING_NAVIGATION_SHOW_CLAMPING_WARNING,
            DEFAULT_NAVIGATION_SHOW_CLAMPING_WARNING,
          )
        ) {
          await this.ideAdapter.showWarningMessage(clampingMessage);
        } else {
          this.logger.debug(
            { ...logCtx, suppressedMessage: clampingMessage },
            'Clamping warning suppressed by setting',
          );
        }
      } else {
        const toastMessage = formatMessage(MessageCode.INFO_NAVIGATION_SUCCESS, { path, position });
        if (
          this.configReader.getBoolean(
            SETTING_NAVIGATION_SHOW_NAVIGATED_TOAST,
            DEFAULT_NAVIGATION_SHOW_NAVIGATED_TOAST,
          )
        ) {
          await this.ideAdapter.showInformationMessage(toastMessage);
        } else {
          this.logger.debug(
            { ...logCtx, suppressedMessage: toastMessage },
            'Navigated toast suppressed by setting',
          );
        }
      }
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
