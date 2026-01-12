import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { FocusErrorReason, type FocusResult, type PasteExecutor } from './PasteExecutor';

/**
 * PasteExecutor for text editor destinations.
 *
 * Stores the document URI and view column (immutable) rather than the editor
 * reference (mutable). On focus(), retrieves a fresh editor via showTextDocument()
 * and captures it in the insert closure.
 */
export class EditorPasteExecutor implements PasteExecutor {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly documentUri: vscode.Uri,
    private readonly viewColumn: vscode.ViewColumn | undefined,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    try {
      const freshEditor = await this.ideAdapter.showTextDocument(this.documentUri, {
        viewColumn: this.viewColumn,
      });

      this.logger.debug(
        { ...context, editorUri: this.documentUri.toString() },
        'Editor focused via showTextDocument()',
      );

      return Result.ok({
        insert: this.createInsertFunction(freshEditor),
      });
    } catch (error) {
      this.logger.warn(
        { ...context, editorUri: this.documentUri.toString(), error },
        'Failed to focus editor',
      );
      return Result.err({
        reason: FocusErrorReason.SHOW_DOCUMENT_FAILED,
        cause: error,
      });
    }
  }

  private createInsertFunction(
    editor: vscode.TextEditor,
  ): (text: string, context: LoggingContext) => Promise<boolean> {
    return async (text: string, context: LoggingContext): Promise<boolean> => {
      const editorUri = editor.document.uri.toString();

      try {
        const success = await this.ideAdapter.insertTextAtCursor(editor, text);
        if (success) {
          this.logger.info({ ...context, editorUri }, 'Cursor insert succeeded');
        } else {
          this.logger.info({ ...context, editorUri }, 'Cursor insert failed');
        }
        return success;
      } catch (error) {
        this.logger.warn({ ...context, editorUri, error }, 'Cursor insert threw exception');
        return false;
      }
    };
  }
}
