import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';

import type { InsertFactory } from './InsertFactory';

/**
 * InsertFactory for Tier 3 manual-paste destinations.
 *
 * Writes the link text to clipboard and returns true. No paste commands
 * are executed — the user pastes manually (Cmd+V) after the toast.
 * Clipboard preservation is intentionally NOT used: the link must remain
 * on the clipboard until the user pastes.
 */
export class ManualPasteInsertFactory implements InsertFactory<void> {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  forTarget(): (text: string) => Promise<boolean> {
    return async (text: string): Promise<boolean> => {
      const fn = 'ManualPasteInsertFactory.insert';

      try {
        await this.ideAdapter.writeTextToClipboard(text);
      } catch (error) {
        this.logger.warn({ fn, error }, 'Failed to write to clipboard');
        return false;
      }

      this.logger.info(
        { fn, textLength: text.length },
        'Link copied to clipboard for manual paste',
      );
      return true;
    };
  }
}
