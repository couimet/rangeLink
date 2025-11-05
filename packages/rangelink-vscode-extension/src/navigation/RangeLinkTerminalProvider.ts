import type { DelimiterConfig, Logger, ParsedLink } from 'rangelink-core-ts';
import { buildLinkPattern, parseLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { RangeLinkTerminalLink } from '../types';
import { convertRangeLinkPosition } from '../utils/convertRangeLinkPosition';
import { formatLinkPosition } from '../utils/formatLinkPosition';
import { formatLinkTooltip } from '../utils/formatLinkTooltip';
import { resolveWorkspacePath } from '../utils/resolveWorkspacePath';

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
      const parsedCount = links.filter((l) => l.parsed).length;
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
   * Opens the file and navigates to the specified position.
   * Supports single positions, ranges, and rectangular mode.
   *
   * @param link - The terminal link that was clicked
   */
  async handleTerminalLink(link: RangeLinkTerminalLink): Promise<void> {
    const linkText = link.data;

    // Parse failed - show warning and return
    if (!link.parsed) {
      this.logger.warn(
        {
          fn: 'RangeLinkTerminalProvider.handleTerminalLink',
          link: linkText,
        },
        'Terminal link clicked but parse failed',
      );

      vscode.window.showWarningMessage(`RangeLink detected but failed to parse: ${linkText}`);
      return;
    }

    const { path, start, end, selectionType } = link.parsed;

    this.logger.info(
      {
        fn: 'RangeLinkTerminalProvider.handleTerminalLink',
        link: linkText,
        parsed: link.parsed,
      },
      'Terminal link clicked - attempting navigation',
    );

    // Resolve path to file URI
    const fileUri = await resolveWorkspacePath(path);
    if (!fileUri) {
      this.logger.error(
        {
          fn: 'RangeLinkTerminalProvider.handleTerminalLink',
          link: linkText,
          path,
        },
        'File not found',
      );

      vscode.window.showErrorMessage(`RangeLink: File not found: ${path}`);
      return;
    }

    // Open document
    let document: vscode.TextDocument;
    try {
      document = await vscode.workspace.openTextDocument(fileUri);
    } catch (error) {
      this.logger.error(
        {
          fn: 'RangeLinkTerminalProvider.handleTerminalLink',
          link: linkText,
          path,
          error,
        },
        'Failed to open document',
      );

      vscode.window.showErrorMessage(`RangeLink: Failed to open file: ${path}`);
      return;
    }

    // Convert 1-indexed RangeLink positions to 0-indexed VSCode positions (with clamping)
    const startPos = convertRangeLinkPosition(start, document);
    const endPos = convertRangeLinkPosition(end, document);

    // Create selections based on selection type
    let selections: vscode.Selection[];

    if (selectionType === 'Rectangular') {
      // Rectangular mode: Create multiple selections (one per line)
      selections = [];
      for (let line = startPos.line; line <= endPos.line; line++) {
        const lineStartPos = convertRangeLinkPosition(
          { line: line + 1, char: start.char },
          document,
        );
        const lineEndPos = convertRangeLinkPosition({ line: line + 1, char: end.char }, document);

        const anchor = new vscode.Position(line, lineStartPos.character);
        const active = new vscode.Position(line, lineEndPos.character);
        selections.push(new vscode.Selection(anchor, active));
      }

      this.logger.debug(
        {
          fn: 'RangeLinkTerminalProvider.handleTerminalLink',
          selectionType: 'Rectangular',
          selectionsCreated: selections.length,
          startLine: startPos.line + 1,
          endLine: endPos.line + 1,
          columnRange: `${startPos.character + 1}-${endPos.character + 1}`,
        },
        'Created rectangular selections',
      );
    } else {
      // Normal mode: Single selection from start to end
      const anchor = new vscode.Position(startPos.line, startPos.character);
      const active = new vscode.Position(endPos.line, endPos.character);
      selections = [new vscode.Selection(anchor, active)];

      this.logger.debug(
        {
          fn: 'RangeLinkTerminalProvider.handleTerminalLink',
          selectionType: 'Normal',
          startPos: `${startPos.line + 1}:${startPos.character + 1}`,
          endPos: `${endPos.line + 1}:${endPos.character + 1}`,
        },
        'Created normal selection',
      );
    }

    // Show document with selections
    const editor = await vscode.window.showTextDocument(document, {
      selection: selections[0], // Primary selection for viewport positioning
      preserveFocus: false,
    });

    // Apply all selections (for rectangular mode)
    editor.selections = selections;

    // Reveal the first selection in the viewport
    editor.revealRange(selections[0], vscode.TextEditorRevealType.InCenterIfOutsideViewport);

    this.logger.info(
      {
        fn: 'RangeLinkTerminalProvider.handleTerminalLink',
        link: linkText,
        path,
        selectionsApplied: selections.length,
      },
      'Navigation completed successfully',
    );

    const position = formatLinkPosition(start, end);
    vscode.window.showInformationMessage(`RangeLink: Navigated to ${path} @ ${position}`);
  }
}
