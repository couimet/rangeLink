import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';

import type { ChatPasteHelperFactory } from './ChatPasteHelperFactory';
import { ClaudeCodeDestination } from './ClaudeCodeDestination';
import { CursorAIDestination } from './CursorAIDestination';
import { GitHubCopilotChatDestination } from './GitHubCopilotChatDestination';
import { DESTINATION_TYPES, type DestinationType, type PasteDestination } from './PasteDestination';
import { TerminalDestination } from './TerminalDestination';
import { TextEditorDestination } from './TextEditorDestination';

/**
 * Type-safe options for creating destinations
 *
 * Terminal and text-editor destinations require resources at construction.
 * AI assistant destinations only need availability checks (no resource required).
 */
export type CreateOptions =
  | { type: 'terminal'; terminal: vscode.Terminal }
  | { type: 'text-editor'; editor: vscode.TextEditor }
  | { type: 'cursor-ai' | 'claude-code' | 'github-copilot-chat' };

/**
 * Display names for destination types
 *
 * Used for UI components (command palette, status bar, QuickPick menus, error messages).
 */
const DISPLAY_NAMES: Record<DestinationType, string> = {
  terminal: 'Terminal',
  'text-editor': 'Text Editor',
  'cursor-ai': 'Cursor AI Assistant',
  'github-copilot-chat': 'GitHub Copilot Chat',
  'claude-code': 'Claude Code Chat',
};

/**
 * Factory for creating paste destination instances
 *
 * Centralizes destination instantiation logic and provides
 * metadata for UI components (QuickPick menus, settings, etc.).
 *
 * Design pattern: Simple factory (not full DI container)
 * - Sufficient for 3 destination types
 * - Easy to test and maintain
 * - No external dependencies
 */
export class DestinationFactory {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly chatPasteHelperFactory: ChatPasteHelperFactory,
    private readonly logger: Logger,
  ) {}

  /**
   * Create a destination instance with type-safe resource requirements
   *
   * Terminal and text-editor destinations require resources at construction.
   * AI assistant destinations only need runtime availability checks.
   *
   * @param options - Discriminated union specifying destination type and required resources
   * @returns New destination instance with dependencies injected
   * @throws RangeLinkExtensionError with DESTINATION_NOT_IMPLEMENTED if type not yet supported
   */
  create(options: CreateOptions): PasteDestination {
    const type = options.type;
    this.logger.debug({ fn: 'DestinationFactory.create', type }, `Creating destination: ${type}`);

    switch (options.type) {
      case 'terminal':
        return new TerminalDestination(options.terminal, this.ideAdapter, this.logger);

      case 'cursor-ai':
        return new CursorAIDestination(this.ideAdapter, this.chatPasteHelperFactory, this.logger);

      case 'text-editor':
        return new TextEditorDestination(options.editor, this.ideAdapter, this.logger);

      case 'claude-code':
        return new ClaudeCodeDestination(this.ideAdapter, this.chatPasteHelperFactory, this.logger);

      case 'github-copilot-chat':
        return new GitHubCopilotChatDestination(this.ideAdapter, this.logger);

      default:
        // Phase 2+: Will implement github-copilot
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_IMPLEMENTED,
          message: `Destination type not yet implemented: ${type}`,
          functionName: 'DestinationFactory.create',
          details: { destinationType: type },
        });
    }
  }

  /**
   * Get all supported destination types
   *
   * Used by UI components (QuickPick menus) to list available destinations.
   * Returns a copy of DESTINATION_TYPES to prevent external mutation.
   *
   * @returns Array of supported destination type identifiers
   */
  getSupportedTypes(): DestinationType[] {
    return [...DESTINATION_TYPES];
  }

  /**
   * Get display names for all destination types
   *
   * Maps destination identifiers to user-friendly names shown in:
   * - Command palette
   * - Status bar messages
   * - QuickPick menus
   * - Error messages
   *
   * @returns Record mapping destination types to display names
   */
  getDisplayNames(): Record<DestinationType, string> {
    return DISPLAY_NAMES;
  }
}
