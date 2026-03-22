import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { ActiveSelections, MessageCode } from '../types';
import { formatMessage } from '../utils';

/**
 * Validates active editor selections and provides diagnostic logging.
 */
export class SelectionValidator {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * Validate that an active editor exists with non-empty selections.
   * Shows context-appropriate error message on failure.
   *
   * @returns Object with editor and selections if valid, undefined if validation failed
   */
  validateSelectionsAndShowError():
    | { editor: vscode.TextEditor; selections: readonly vscode.Selection[] }
    | undefined {
    const logCtx = { fn: 'SelectionValidator.validateSelectionsAndShowError' };
    const activeSelections = ActiveSelections.create(this.ideAdapter.activeTextEditor);

    this.logger.debug(
      {
        ...logCtx,
        hasEditor: !!activeSelections.editor,
        selectionCount: activeSelections.selections.length,
        selections: this.mapSelectionsForLogging(activeSelections.selections),
        documentVersion: activeSelections.editor?.document.version,
        documentLineCount: activeSelections.editor?.document.lineCount,
        documentIsDirty: activeSelections.editor?.document.isDirty,
        documentIsClosed: activeSelections.editor?.document.isClosed,
      },
      'Selection validation starting',
    );

    const nonEmptySelections = activeSelections.getNonEmptySelections();

    if (!nonEmptySelections) {
      const errorCode = activeSelections.editor
        ? MessageCode.ERROR_NO_TEXT_SELECTED
        : MessageCode.ERROR_NO_ACTIVE_EDITOR;
      const errorMsg = formatMessage(errorCode);

      const editor = activeSelections.editor;
      const lineContentAtBoundaries = editor
        ? this.getLineContentAtSelectionBoundaries(editor.document, activeSelections.selections)
        : undefined;

      this.logger.warn(
        {
          ...logCtx,
          hasEditor: !!editor,
          errorCode,
          selectionCount: activeSelections.selections.length,
          selections: this.mapSelectionsForLogging(activeSelections.selections),
          documentVersion: editor?.document.version,
          documentLineCount: editor?.document.lineCount,
          documentIsDirty: editor?.document.isDirty,
          documentIsClosed: editor?.document.isClosed,
          lineContentAtBoundaries,
        },
        'Selection validation failed - full diagnostic context',
      );

      this.ideAdapter.showErrorMessage(errorMsg);
      return undefined;
    }

    return { editor: activeSelections.editor!, selections: nonEmptySelections };
  }

  /**
   * Maps selections to a logging-friendly format with defensive property access.
   */
  mapSelectionsForLogging(selections: readonly vscode.Selection[]): Array<{
    index: number;
    start: { line: number | undefined; char: number | undefined };
    end: { line: number | undefined; char: number | undefined };
    isEmpty: boolean | undefined;
  }> {
    return selections.map((s, i) => ({
      index: i,
      start: { line: s.start?.line, char: s.start?.character },
      end: { line: s.end?.line, char: s.end?.character },
      isEmpty: s.isEmpty,
    }));
  }

  /**
   * Extracts line content at selection boundaries for diagnostic logging.
   * Returns undefined for lines that are out of bounds (indicating stale selection state).
   */
  getLineContentAtSelectionBoundaries(
    document: vscode.TextDocument,
    selections: readonly vscode.Selection[],
  ): Array<{
    index: number;
    startLineContent: string | undefined;
    endLineContent: string | undefined;
  }> {
    return selections.map((sel, index) => {
      let startLineContent: string | undefined;
      let endLineContent: string | undefined;

      const startLine = sel.start?.line;
      const endLine = sel.end?.line;

      try {
        if (startLine !== undefined && startLine >= 0 && startLine < document.lineCount) {
          startLineContent = document.lineAt(startLine).text;
        }
      } catch {
        startLineContent = undefined;
      }

      try {
        if (endLine !== undefined && endLine >= 0 && endLine < document.lineCount) {
          endLineContent = document.lineAt(endLine).text;
        }
      } catch {
        endLineContent = undefined;
      }

      return { index, startLineContent, endLineContent };
    });
  }
}
