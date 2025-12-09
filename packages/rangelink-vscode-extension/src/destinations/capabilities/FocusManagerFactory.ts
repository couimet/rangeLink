import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { CommandFocusManager } from './CommandFocusManager';
import { EditorFocusManager } from './EditorFocusManager';
import type { FocusManager } from './FocusManager';
import { TerminalFocusManager } from './TerminalFocusManager';

/**
 * Factory for creating FocusManager instances.
 *
 * Encapsulates the creation of focus management strategies, providing
 * a clean API for the DestinationRegistry to create managers without
 * knowing implementation details.
 *
 * Benefits:
 * - Centralizes dependency injection (ideAdapter, logger)
 * - Simplifies destination builder code
 * - Enables easy mocking in tests
 */
export class FocusManagerFactory {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * Create a terminal focus manager.
   *
   * Used by terminal destinations to bring terminal to foreground.
   *
   * @param terminal - The terminal to focus
   * @returns FocusManager that focuses the terminal
   */
  createTerminalFocus(terminal: vscode.Terminal): FocusManager {
    return new TerminalFocusManager(this.ideAdapter, terminal, this.logger);
  }

  /**
   * Create an editor focus manager.
   *
   * Used by text editor destinations to bring editor to foreground.
   *
   * @param editor - The editor to focus
   * @returns FocusManager that focuses the editor
   */
  createEditorFocus(editor: vscode.TextEditor): FocusManager {
    return new EditorFocusManager(this.ideAdapter, editor, this.logger);
  }

  /**
   * Create a command-based focus manager.
   *
   * Used by chat assistant destinations to focus via extension commands.
   *
   * @param commands - Commands to try for focusing (in order)
   * @returns FocusManager that focuses via command execution
   */
  createCommandFocus(commands: string[]): FocusManager {
    return new CommandFocusManager(this.ideAdapter, commands, this.logger);
  }
}
