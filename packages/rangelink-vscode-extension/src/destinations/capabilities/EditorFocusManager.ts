import type { Logger, LoggingContext } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { FocusManager } from './FocusManager';

/**
 * Focuses text editor by showing document.
 *
 * Used by:
 * - TextEditor destinations: Ensure editor is visible and active before paste
 */
export class EditorFocusManager implements FocusManager {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly editor: vscode.TextEditor,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<void> {
    try {
      await this.ideAdapter.showTextDocument(this.editor.document.uri, {
        viewColumn: this.editor.viewColumn,
      });
      this.logger.debug(
        { ...context, editorUri: this.editor.document.uri.toString() },
        'Editor focused via showTextDocument()',
      );
    } catch (error) {
      this.logger.warn({ ...context, error }, 'Failed to focus editor');
    }
  }
}
