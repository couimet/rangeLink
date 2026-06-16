import type { Logger } from '@couimet/logger-contract';

import type { InsertFactory } from './InsertFactory';

/**
 * InsertFactory for Tier 3 manual-paste destinations.
 *
 * Returns true without touching the clipboard — ClipboardRouter already wrote
 * the text, and shouldPreserveClipboard() = false ensures it stays for manual paste.
 * No paste commands are executed; the user pastes manually (Cmd+V) after the toast.
 */
export class ManualPasteInsertFactory implements InsertFactory<void> {
  constructor(private readonly logger: Logger) {}

  forTarget(): (text: string) => Promise<boolean> {
    return async (text: string): Promise<boolean> => {
      this.logger.info(
        { fn: 'ManualPasteInsertFactory.insert', textLength: text.length },
        'Link ready for manual paste',
      );
      return true;
    };
  }
}
