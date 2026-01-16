import { getLogger } from 'barebone-logger';
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
): InputSelection => {
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
      const message =
        'Cannot generate link: document was modified and selection is no longer valid. Please reselect and try again.';
      getLogger().error(
        {
          fn: 'toInputSelection',
          error,
          line: sel.end.line,
          documentLines: document.lineCount,
        },
        'Document modified during link generation - selection out of bounds',
      );
      // TODO: Replace with RangeLinkExtensionError using RangeLinkExtensionErrorCodes.SELECTION_CONVERSION_FAILED
      throw new Error(message);
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

  return {
    selections,
    selectionType: isRectangular ? SelectionType.Rectangular : SelectionType.Normal,
  };
};
