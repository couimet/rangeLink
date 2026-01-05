import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { CommandPasteExecutor } from './CommandPasteExecutor';
import { EditorPasteExecutor } from './EditorPasteExecutor';
import type { PasteExecutor } from './PasteExecutor';
import { TerminalPasteExecutor } from './TerminalPasteExecutor';

/**
 * Factory for creating PasteExecutor instances.
 *
 * Replaces the separate FocusManagerFactory and TextInserterFactory with a
 * unified factory that creates executors handling both focus and insert.
 */
export class PasteExecutorFactory {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  createEditorExecutor(editor: vscode.TextEditor): PasteExecutor {
    return new EditorPasteExecutor(
      this.ideAdapter,
      editor.document.uri,
      editor.viewColumn,
      this.logger,
    );
  }

  createTerminalExecutor(terminal: vscode.Terminal): PasteExecutor {
    return new TerminalPasteExecutor(this.ideAdapter, terminal, this.logger);
  }

  createCommandExecutor(focusCommands: string[], pasteCommands: string[]): PasteExecutor {
    return new CommandPasteExecutor(this.ideAdapter, focusCommands, pasteCommands, this.logger);
  }
}
