import type { Logger, LoggingContext } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import type { TextInserter } from './TextInserter';

/**
 * Inserts text at editor cursor position via VSCode API.
 *
 * Used by:
 * - TextEditor: Direct insertion at cursor
 */
export class EditorTextInserter implements TextInserter {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly editor: vscode.TextEditor,
    private readonly logger: Logger,
  ) {}

  async insert(text: string, context: LoggingContext): Promise<boolean> {
    const success = await this.ideAdapter.insertTextAtCursor(this.editor, text);
    if (success) {
      this.logger.info(
        { ...context, editorUri: this.editor.document.uri.toString() },
        'Cursor insert succeeded',
      );
    } else {
      this.logger.info(
        { ...context, editorUri: this.editor.document.uri.toString() },
        'Cursor insert failed',
      );
    }
    return success;
  }
}
