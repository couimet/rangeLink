import type { ClipboardService } from '../../../clipboard/ClipboardService';
import type { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';

import type { InsertFactory } from './InsertFactory';

import type { Logger } from '@couimet/logger-contract';

/**
 * InsertFactory for AI assistant destinations.
 *
 * AI assistants (Claude Code, Cursor AI, GitHub Copilot Chat, Cline)
 * use clipboard-based paste via the VS Code paste command. This factory stages
 * the text parameter (the smart-padded link) on the clipboard through
 * ClipboardService, dispatches the paste command, then restores the previous
 * clipboard so the send pipeline's raw-link clipboard contract is preserved.
 * pasteClipboardToAiAssistant waits for webview-based assistants to complete
 * their async clipboard read.
 */
export class AIAssistantInsertFactory implements InsertFactory<void> {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly clipboardService: ClipboardService,
    private readonly logger: Logger,
  ) {}

  forTarget(): (text: string) => Promise<boolean> {
    return async (text: string): Promise<boolean> => {
      const fn = 'AIAssistantInsertFactory.insert';

      const stageResult = await this.clipboardService.stage(text, () => this.ideAdapter.pasteClipboardToAiAssistant());

      if (!stageResult.success) {
        this.logger.warn({ fn, error: stageResult.error }, 'Clipboard paste command failed');
        return false;
      }

      if (!stageResult.value) {
        this.logger.warn({ fn, allCommandsFailed: true }, 'Clipboard paste command failed');
        return false;
      }

      return true;
    };
  }
}
