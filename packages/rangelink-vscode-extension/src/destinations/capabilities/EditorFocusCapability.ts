import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { MessageCode } from '../../types/MessageCode';
import { formatMessage } from '../../utils';

import { FocusErrorReason, type FocusCapability, type FocusResult } from './FocusCapability';
import type { InsertFactory } from './insertFactories';

/**
 * FocusCapability for text editor destinations.
 *
 * Lifecycle:
 * 1. Created at bind time with the URI + viewColumn the user selected
 *    (via file picker, keybinding, or context menu)
 * 2. Stored inside ComposablePasteDestination.focusCapability
 * 3. Called at paste/jump time — focus() resolves a fresh editor and
 *    returns an inserter closure that captures it
 *
 * viewColumn resolution strategy:
 * - The bound viewColumn is the preferred target (fast path)
 * - If the file is no longer at the bound viewColumn (user moved it),
 *   falls back to scanning visibleTextEditors to follow the file
 * - If the file is not visible anywhere, returns EDITOR_NOT_VISIBLE error
 * - If the file moved and is now in multiple groups, returns
 *   EDITOR_AMBIGUOUS_COLUMNS error (can't determine which one the user meant)
 *
 * Caveat: when a file moves between tab groups, we assume the cursor position
 * in the new location is where the user wants paste/jump to target. This is a
 * KISS assumption — cursor position tracking across tab-group moves may need
 * revisiting if users report issues.
 */
export class EditorFocusCapability implements FocusCapability {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly documentUri: vscode.Uri,
    private readonly boundViewColumn: number,
    private readonly insertFactory: InsertFactory<vscode.TextEditor>,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    const resolvedViewColumn = this.resolveViewColumn();
    if (resolvedViewColumn === undefined) {
      return Result.err({ reason: FocusErrorReason.EDITOR_NOT_VISIBLE });
    }
    if (resolvedViewColumn === 'ambiguous') {
      return Result.err({ reason: FocusErrorReason.EDITOR_AMBIGUOUS_COLUMNS });
    }

    const editorUri = this.documentUri.toString();

    let freshEditor: vscode.TextEditor;
    try {
      freshEditor = await this.ideAdapter.showTextDocument(this.documentUri, {
        viewColumn: resolvedViewColumn,
      });
    } catch (error) {
      this.logger.warn(
        { ...context, editorUri, viewColumn: resolvedViewColumn, error },
        'Failed to focus editor',
      );
      return Result.err({
        reason: FocusErrorReason.SHOW_DOCUMENT_FAILED,
        cause: error,
      });
    }

    this.logger.debug(
      { ...context, editorUri, viewColumn: resolvedViewColumn },
      'Editor focused via showTextDocument()',
    );

    return Result.ok({ inserter: this.insertFactory.forTarget(freshEditor) });
  }

  /**
   * Resolve which viewColumn to target.
   *
   * Fast path: check if the file is still at the bound viewColumn.
   * Fallback: scan visible editors to follow the file if the user moved it.
   *
   * @returns viewColumn number, 'ambiguous' if in multiple groups, or undefined if not visible
   */
  private resolveViewColumn(): number | 'ambiguous' | undefined {
    const fn = 'EditorFocusCapability.resolveViewColumn';
    const editorUri = this.documentUri.toString();

    if (this.ideAdapter.hasVisibleEditorAt(this.documentUri, this.boundViewColumn)) {
      const matchingEditors = this.ideAdapter.findVisibleEditorsByUri(this.documentUri);
      if (matchingEditors.length > 1) {
        this.logger.warn(
          {
            fn,
            editorUri,
            matchCount: matchingEditors.length,
            viewColumns: matchingEditors.map((e) => e.viewColumn),
          },
          'Bound editor at expected viewColumn but also found in other tab groups — ambiguous target',
        );
        this.ideAdapter.showErrorMessage(
          formatMessage(MessageCode.ERROR_TEXT_EDITOR_AMBIGUOUS_COLUMNS),
        );
        return 'ambiguous';
      }
      this.logger.debug(
        { fn, editorUri, viewColumn: this.boundViewColumn },
        'Editor at bound viewColumn',
      );
      return this.boundViewColumn;
    }

    const matchingEditors = this.ideAdapter.findVisibleEditorsByUri(this.documentUri);

    if (matchingEditors.length === 0) {
      const tabGroup = this.ideAdapter.findTabGroupForDocument(this.documentUri);
      if (tabGroup && tabGroup.viewColumn === this.boundViewColumn) {
        this.logger.debug(
          { fn, editorUri, viewColumn: this.boundViewColumn },
          'Editor hidden behind other tabs at bound viewColumn',
        );
        return this.boundViewColumn;
      }

      this.logger.warn(
        { fn, editorUri },
        'Bound editor not visible (defensive: auto-unbind should prevent this)',
      );
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_TEXT_EDITOR_NOT_VISIBLE));
      return undefined;
    }

    if (matchingEditors.length > 1) {
      this.logger.warn(
        { fn, editorUri, matchCount: matchingEditors.length },
        'Bound editor moved but found in multiple tab groups — ambiguous target',
      );
      this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TEXT_EDITOR_AMBIGUOUS_COLUMNS),
      );
      return 'ambiguous';
    }

    const movedViewColumn = matchingEditors[0].viewColumn ?? this.boundViewColumn;
    this.logger.debug(
      {
        fn,
        editorUri,
        boundViewColumn: this.boundViewColumn,
        movedViewColumn,
      },
      'Editor moved to different viewColumn, following it',
    );
    return movedViewColumn;
  }
}
