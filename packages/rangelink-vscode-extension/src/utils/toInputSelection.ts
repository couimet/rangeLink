import type { Logger } from 'barebone-logger';
import { InputSelection, Selection, SelectionCoverage, SelectionType } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { isRectangularSelection } from '../isRectangularSelection';

/**
 * Adapter: Converts VSCode Selections to core InputSelection interface
 * Detects coverage (FullLine vs PartialLine) for each selection
 */
export const toInputSelection = (
  document: vscode.TextDocument,
  vscodeSelections: readonly vscode.Selection[],
  logger: Logger,
): InputSelection => {
  logger.debug(
    {
      fn: 'toInputSelection',
      selectionCount: vscodeSelections.length,
      documentVersion: document.version,
      documentLineCount: document.lineCount,
      inputSelections: vscodeSelections.map((s, i) => ({
        index: i,
        start: { line: s.start.line, char: s.start.character },
        end: { line: s.end.line, char: s.end.character },
        isEmpty: s.isEmpty,
      })),
    },
    'Converting VSCode selections to InputSelection',
  );

  // VSCode doesn't expose rectangular selection mode in API
  // Use heuristic to detect rectangular selections based on patterns
  const isRectangular = isRectangularSelection(vscodeSelections);

  // When multiple selections exist but don't form a rectangular pattern,
  // only use the primary (first) selection
  const selectionsToConvert = isRectangular ? vscodeSelections : [vscodeSelections[0]];

  const selections: Selection[] = [];

  for (const sel of selectionsToConvert) {
    // Detect if this is a full-line selection
    // If lineAt throws, it means the document was modified and selection is invalid
    let coverage = SelectionCoverage.PartialLine;

    // Detect if selection includes trailing newline (VSCode quirk)
    // When user selects "line 20 + newline", VSCode reports end as (21, 0)
    const includesTrailingNewline = sel.end.line > sel.start.line && sel.end.character === 0;

    try {
      const endLine = document.lineAt(sel.end.line);
      const startsAtBeginning = sel.start.character === 0;
      const endsAtEndOfLine =
        sel.end.character === endLine.range.end.character ||
        sel.end.character >= endLine.text.length ||
        includesTrailingNewline;

      if (startsAtBeginning && endsAtEndOfLine) {
        coverage = SelectionCoverage.FullLine;
      }
    } catch (error) {
      // Selection references invalid line numbers - document was modified
      const startLineContent = getLineContentSafe(document, sel.start.line);
      const endLineContent = getLineContentSafe(document, sel.end.line);

      logger.error(
        {
          fn: 'toInputSelection',
          error,
          selection: {
            start: { line: sel.start.line, char: sel.start.character },
            end: { line: sel.end.line, char: sel.end.character },
            isEmpty: sel.isEmpty,
          },
          documentVersion: document.version,
          documentLineCount: document.lineCount,
          startLineContent,
          endLineContent,
        },
        'Document modified during link generation - selection out of bounds',
      );
      // TODO: Replace with RangeLinkExtensionError using RangeLinkExtensionErrorCodes.SELECTION_CONVERSION_FAILED
      throw new Error(
        'Cannot generate link: document was modified and selection is no longer valid. Please reselect and try again.',
      );
    }

    // Normalize end line when selection includes trailing newline
    // VSCode reports (21, 0) for "line 20 + newline" - adjust to point to actual content line
    const adjustedEndLine = includesTrailingNewline ? sel.end.line - 1 : sel.end.line;

    selections.push({
      start: { line: sel.start.line, character: sel.start.character },
      end: { line: adjustedEndLine, character: sel.end.character },
      coverage,
    });
  }

  const result: InputSelection = {
    selections,
    selectionType: isRectangular ? SelectionType.Rectangular : SelectionType.Normal,
  };

  logger.debug(
    {
      fn: 'toInputSelection',
      isRectangular,
      outputSelections: result.selections.map((s, i) => ({
        index: i,
        start: s.start,
        end: s.end,
        coverage: s.coverage,
      })),
      selectionType: result.selectionType,
    },
    'Selection conversion complete',
  );

  return result;
};

/**
 * Safely retrieves line content, returning undefined if the line is out of bounds
 */
const getLineContentSafe = (document: vscode.TextDocument, line: number): string | undefined => {
  try {
    if (line >= 0 && line < document.lineCount) {
      return document.lineAt(line).text;
    }
    return undefined;
  } catch {
    return undefined;
  }
};
