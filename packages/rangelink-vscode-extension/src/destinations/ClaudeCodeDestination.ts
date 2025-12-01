import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../types/AutoPasteResult';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

import { ChatAssistantDestination } from './ChatAssistantDestination';
import type { ChatPasteHelperFactory } from './ChatPasteHelperFactory';
import type { DestinationType } from './PasteDestination';

/**
 * Claude Code Extension paste destination.
 *
 * Automatically pastes RangeLinks to Claude Code's chat interface.
 * Extends ChatAssistantDestination to inherit shared chat assistant logic.
 */
export class ClaudeCodeDestination extends ChatAssistantDestination {
  readonly id: DestinationType = 'claude-code';
  readonly displayName = 'Claude Code Chat';

  // Commands to try opening Claude Code (in order of preference)
  private static readonly CLAUDE_CODE_COMMANDS = [
    'claude-vscode.focus', // Primary: Direct input focus (Cmd+Escape)
    'claude-vscode.sidebar.open', // Fallback: Open sidebar
    'claude-vscode.editor.open', // Fallback: Open in new tab
  ];

  private static readonly EXTENSION_ID = 'anthropic.claude-code';

  constructor(
    ideAdapter: VscodeAdapter,
    chatPasteHelperFactory: ChatPasteHelperFactory,
    logger: Logger,
  ) {
    super(ideAdapter, chatPasteHelperFactory, logger);
  }

  /**
   * Check if Claude Code extension is installed and active.
   *
   * @returns true if Claude Code extension detected, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    const extension = this.ideAdapter.getExtension(ClaudeCodeDestination.EXTENSION_ID);
    return extension !== undefined && extension.isActive;
  }

  /**
   * Get ordered list of commands to try for focusing Claude Code chat.
   *
   * @returns Array of command IDs to try in order
   */
  protected getFocusCommands(): string[] {
    return ClaudeCodeDestination.CLAUDE_CODE_COMMANDS;
  }

  /**
   * Get user instruction for manual paste.
   *
   * @param _autoPasteResult - Result of automatic paste attempt (unused for now)
   * @returns Instruction string for manual paste in Claude Code
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUserInstruction(_autoPasteResult: AutoPasteResult): string | undefined {
    return formatMessage(MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS);
  }

  /**
   * Get success message for jump command.
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    return formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE);
  }
}
