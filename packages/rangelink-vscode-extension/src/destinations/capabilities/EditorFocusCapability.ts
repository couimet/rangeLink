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
 * Resolves the document's viewColumn DYNAMICALLY at focus time by scanning
 * visibleTextEditors, rather than using a stale bind-time snapshot.
 * This handles the case where a user moves the bound editor between tab groups
 * after binding.
 *
 * Three-case resolution:
 * - 0 visible: error (auto-unbind on close should prevent this)
 * - 1 visible: use its current viewColumn
 * - 2+ visible: error (ambiguity — #315 will add proactive UX)
 */
export class EditorFocusCapability implements FocusCapability {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly documentUri: vscode.Uri,
    private readonly insertFactory: InsertFactory<vscode.TextEditor>,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    const documentUriString = this.documentUri.toString();
    const matchingEditors = this.ideAdapter.findVisibleEditorsByUri(this.documentUri);

    if (matchingEditors.length === 0) {
      this.logger.warn(
        { ...context, editorUri: documentUriString },
        'Bound editor not visible — cannot determine target tab group (defensive: auto-unbind should prevent this)',
      );
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_TEXT_EDITOR_NOT_VISIBLE));
      return Result.err({
        reason: FocusErrorReason.EDITOR_NOT_VISIBLE,
      });
    }

    if (matchingEditors.length > 1) {
      this.logger.warn(
        { ...context, editorUri: documentUriString, matchCount: matchingEditors.length },
        'Bound editor open in multiple tab groups — ambiguous target',
      );
      this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TEXT_EDITOR_AMBIGUOUS_COLUMNS),
      );
      return Result.err({
        reason: FocusErrorReason.EDITOR_AMBIGUOUS_COLUMNS,
      });
    }

    const currentViewColumn = matchingEditors[0].viewColumn;

    if (currentViewColumn === undefined) {
      this.logger.warn(
        { ...context, editorUri: documentUriString },
        'Visible editor has no viewColumn (defensive)',
      );
      this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TEXT_EDITOR_VIEWCOLUMN_UNDEFINED),
      );
      return Result.err({
        reason: FocusErrorReason.EDITOR_VIEWCOLUMN_UNDEFINED,
      });
    }

    this.logger.debug(
      { ...context, editorUri: documentUriString, viewColumn: currentViewColumn },
      'Resolved editor viewColumn dynamically',
    );

    let freshEditor: vscode.TextEditor;
    try {
      freshEditor = await this.ideAdapter.showTextDocument(this.documentUri, {
        viewColumn: currentViewColumn,
      });
    } catch (error) {
      this.logger.warn(
        { ...context, editorUri: documentUriString, error },
        'Failed to focus editor',
      );
      return Result.err({
        reason: FocusErrorReason.SHOW_DOCUMENT_FAILED,
        cause: error,
      });
    }

    this.logger.debug(
      { ...context, editorUri: documentUriString },
      'Editor focused via showTextDocument()',
    );

    return Result.ok({ inserter: this.insertFactory.forTarget(freshEditor) });
  }
}
