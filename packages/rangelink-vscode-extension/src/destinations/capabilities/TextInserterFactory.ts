import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { ClipboardTextInserter } from './ClipboardTextInserter';
import { EditorTextInserter } from './EditorTextInserter';
import { NativeCommandTextInserter } from './NativeCommandTextInserter';
import type { TextInserter } from './TextInserter';

/**
 * Factory for creating TextInserter instances.
 *
 * Encapsulates the creation of text insertion strategies, providing
 * a clean API for the DestinationRegistry to create inserters without
 * knowing implementation details.
 *
 * Benefits:
 * - Centralizes dependency injection (ideAdapter, logger)
 * - Simplifies destination builder code
 * - Enables easy mocking in tests
 */
export class TextInserterFactory {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * Create a clipboard-based text inserter.
   *
   * Used by destinations that paste via clipboard (Terminal, Claude Code, Cursor AI).
   *
   * @param pasteCommands - Commands to try for pasting (in order)
   * @param beforePaste - Optional callback to execute before paste (e.g., focus terminal)
   * @returns TextInserter that uses clipboard + paste command
   */
  createClipboardInserter(
    pasteCommands: string[],
    beforePaste?: () => Promise<void>,
  ): TextInserter {
    return new ClipboardTextInserter(this.ideAdapter, pasteCommands, beforePaste, this.logger);
  }

  /**
   * Create a native command-based text inserter.
   *
   * Used by destinations with native API support (GitHub Copilot Chat).
   *
   * @param command - The VSCode command to execute
   * @param buildCommandArgs - Function to build command arguments from text
   * @returns TextInserter that uses native command API
   */
  createNativeCommandInserter(
    command: string,
    buildCommandArgs: (text: string) => Record<string, unknown>,
  ): TextInserter {
    return new NativeCommandTextInserter(this.ideAdapter, command, buildCommandArgs, this.logger);
  }

  /**
   * Create an editor cursor-based text inserter.
   *
   * Used by text editor destinations that insert directly at cursor.
   *
   * @param editor - The text editor to insert into
   * @returns TextInserter that inserts at cursor position
   */
  createEditorInserter(editor: vscode.TextEditor): TextInserter {
    return new EditorTextInserter(this.ideAdapter, editor, this.logger);
  }
}
