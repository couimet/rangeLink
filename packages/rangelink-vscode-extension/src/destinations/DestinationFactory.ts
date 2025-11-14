import type { Logger } from 'barebone-logger';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';

import { ClaudeCodeDestination } from './ClaudeCodeDestination';
import { CursorAIDestination } from './CursorAIDestination';
import type { DestinationType, PasteDestination } from './PasteDestination';
import { TerminalDestination } from './TerminalDestination';
import { TextEditorDestination } from './TextEditorDestination';

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
    private readonly logger: Logger,
  ) {}

  /**
   * Create a destination instance by type
   *
   * @param type - The destination type to create
   * @returns New destination instance with logger injected
   * @throws RangeLinkExtensionError with DESTINATION_NOT_IMPLEMENTED if type not yet supported
   */
  create(type: DestinationType): PasteDestination {
    this.logger.debug({ fn: 'DestinationFactory.create', type }, `Creating destination: ${type}`);

    switch (type) {
      case 'terminal':
        return new TerminalDestination(this.logger);

      case 'cursor-ai':
        return new CursorAIDestination(this.ideAdapter, this.logger);

      case 'text-editor':
        return new TextEditorDestination(this.ideAdapter, this.logger);

      case 'claude-code':
        return new ClaudeCodeDestination(this.logger);

      // Future implementations:
      // case 'github-copilot':
      //   return new GitHubCopilotDestination(this.logger);

      default:
        // Phase 2+: Will implement text-editor, cursor-ai, github-copilot, and claude-code
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
   *
   * @returns Array of supported destination type identifiers
   */
  getSupportedTypes(): DestinationType[] {
    return [
      'terminal',
      'cursor-ai',
      'text-editor',
      'claude-code',
      // Future: Phase 2+ additions
      // 'github-copilot',
    ];
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
    return {
      terminal: 'Terminal',
      'text-editor': 'Text Editor',
      'cursor-ai': 'Cursor AI Assistant',
      'github-copilot': 'GitHub Copilot Chat',
      'claude-code': 'Claude Code Chat',
    };
  }
}
