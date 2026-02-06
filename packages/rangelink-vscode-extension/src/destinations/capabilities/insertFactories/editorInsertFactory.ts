import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';

import type { InsertFactory } from './InsertFactory';

/**
 * InsertFactory for text editor destinations.
 *
 * Uses direct cursor insertion via insertTextAtCursor.
 */
export class EditorInsertFactory implements InsertFactory<vscode.TextEditor> {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  forTarget(editor: vscode.TextEditor): (text: string) => Promise<boolean> {
    const editorUri = editor.document.uri.toString();

    return async (text: string): Promise<boolean> => {
      const fn = 'EditorInsertFactory.insert';
      try {
        const success = await this.ideAdapter.insertTextAtCursor(editor, text);
        if (success) {
          this.logger.info({ fn, editorUri }, 'Editor insert succeeded');
        } else {
          this.logger.info({ fn, editorUri }, 'Editor insert failed');
        }
        return success;
      } catch (error) {
        this.logger.warn({ fn, editorUri, error }, 'Editor insert threw exception');
        return false;
      }
    };
  }
}
