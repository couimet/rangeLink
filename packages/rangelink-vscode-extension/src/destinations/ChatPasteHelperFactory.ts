import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';

import { ChatPasteHelper } from './ChatPasteHelper';

/**
 * Factory for creating ChatPasteHelper instances.
 *
 * Enables dependency injection in chat destination classes for easier testing.
 */
export class ChatPasteHelperFactory {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * Create a new ChatPasteHelper instance.
   *
   * @returns ChatPasteHelper configured with ideAdapter and logger
   */
  create(): ChatPasteHelper {
    return new ChatPasteHelper(this.ideAdapter, this.logger);
  }
}
