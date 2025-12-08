import type { Logger, LoggingContext } from 'barebone-logger';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { TextInserter } from './TextInserter';

/**
 * Inserts text via native command API.
 *
 * Used by:
 * - GitHub Copilot: workbench.action.chat.open with query parameter
 */
export class NativeCommandTextInserter implements TextInserter {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly command: string,
    private readonly buildCommandArgs: (text: string) => Record<string, unknown>,
    private readonly logger: Logger,
  ) {}

  async insert(text: string, context: LoggingContext): Promise<boolean> {
    try {
      const args = this.buildCommandArgs(text);
      await this.ideAdapter.executeCommand(this.command, args);
      this.logger.info({ ...context, command: this.command }, 'Native command insert succeeded');
      return true;
    } catch (error) {
      this.logger.info(
        { ...context, command: this.command, error },
        'Native command insert failed',
      );
      return false;
    }
  }
}
