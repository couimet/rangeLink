import { getLogger } from 'barebone-logger';
import {
  InputSelection,
  Selection,
  SelectionCoverage,
  SelectionType,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { isRectangularSelection } from '../isRectangularSelection';

/**
 * Adapter: Converts VSCode Selections to core InputSelection interface
 * Detects coverage (FullLine vs PartialLine) for each selection
 */
export const toInputSelection = (
  editor: vscode.TextEditor,
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

    try {
      const endLine = editor.document.lineAt(sel.end.line);
      const startsAtBeginning = sel.start.character === 0;
      const endsAtEndOfLine =
        sel.end.character === endLine.range.end.character ||
        sel.end.character >= endLine.text.length ||
        (sel.end.line > sel.start.line && sel.end.character === 0);

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
          documentLines: editor.document.lineCount,
        },
        'Document modified during link generation - selection out of bounds',
      );
      // TODO: Replace with RangeLinkExtensionError using RangeLinkExtensionErrorCodes.SELECTION_CONVERSION_FAILED
      throw new Error(message);
    }

    selections.push({
      start: { line: sel.start.line, char: sel.start.character },
      end: { line: sel.end.line, char: sel.end.character },
      coverage,
    });
  }

  return {
    selections,
    selectionType: isRectangular ? SelectionType.Rectangular : SelectionType.Normal,
  };
};
