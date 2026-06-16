import type { Logger } from '@couimet/logger-contract';

import type { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';

import type { InsertFactory } from './InsertFactory';

/**
 * InsertFactory for AI assistant destinations.
 *
 * AI assistants (Claude Code, Cursor AI, GitHub Copilot Chat)
 * use clipboard-based paste via the VS Code paste command. The clipboard is
 * populated once by ClipboardRouter.executeCopyAndSend() before this factory
 * is invoked — this factory only executes the paste command and waits for
 * webview-based assistants to complete their async clipboard read.
 */
export class AIAssistantInsertFactory implements InsertFactory<void> {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  forTarget(): (text: string) => Promise<boolean> {
    return async (_text: string): Promise<boolean> => {
      const fn = 'AIAssistantInsertFactory.insert';

      const success = await this.ideAdapter.pasteClipboardToAiAssistant();
      if (success) {
        return true;
      }

      this.logger.warn({ fn, allCommandsFailed: true }, 'Clipboard paste command failed');
      return false;
    };
  }
}
