import type { Logger } from 'barebone-logger';

import type { ClipboardPreserver } from '../clipboard/ClipboardPreserver';
import type { ConfigReader } from '../config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_CONTENT,
  SETTING_SMART_PADDING_PASTE_CONTENT,
  VSCODE_CMD_TERMINAL_COPY_SELECTION,
} from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode, PasteContentType, type TerminalPasteResult } from '../types';
import { formatMessage } from '../utils';

import type { ClipboardRouter } from './ClipboardRouter';

/**
 * Handles terminal selection pasting, the R-L bridge in terminal context,
 * and the R-C guard that prevents link generation from terminals.
 */
export class TerminalSelectionService {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
    private readonly configReader: ConfigReader,
    private readonly clipboardPreserver: ClipboardPreserver,
    private readonly clipboardRouter: ClipboardRouter,
    private readonly logger: Logger,
  ) {}

  // Clipboard roundtrip can be revisited if microsoft/vscode#188173 ships a Terminal.selection API,
  // but adopting it would raise our minimum VSCode engine version.
  async pasteTerminalSelectionToDestination(): Promise<TerminalPasteResult> {
    const logCtx = { fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination' };

    const activeTerminal = this.ideAdapter.activeTerminal;
    if (!activeTerminal) {
      this.logger.debug(logCtx, 'No active terminal');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TERMINAL));
      return { outcome: 'no-active-terminal' };
    }

    let terminalText: string;
    let copyCommandFailed = false;
    try {
      terminalText = await this.clipboardPreserver.preserve(async () => {
        try {
          await this.ideAdapter.executeCommand(VSCODE_CMD_TERMINAL_COPY_SELECTION);
        } catch (e) {
          copyCommandFailed = true;
          throw e;
        }
        return this.ideAdapter.readTextFromClipboard();
      });
    } catch (error) {
      if (copyCommandFailed) {
        this.logger.error(
          { ...logCtx, terminalName: activeTerminal.name, error },
          'executeCommand(terminal.copySelection) threw',
        );
        this.ideAdapter.showErrorMessage(
          formatMessage(MessageCode.ERROR_TERMINAL_COPY_COMMAND_FAILED),
        );
        return { outcome: 'copy-command-failed', error };
      }
      this.logger.error(
        { ...logCtx, terminalName: activeTerminal.name, error },
        'readTextFromClipboard() threw',
      );
      this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TERMINAL_CLIPBOARD_READ_FAILED),
      );
      return { outcome: 'clipboard-read-failed', error };
    }

    if (!terminalText) {
      this.logger.debug(logCtx, 'No terminal text after clipboard roundtrip');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_TERMINAL_TEXT_SELECTED));
      return { outcome: 'no-text-selected' };
    }

    this.logger.debug(
      { ...logCtx, contentLength: terminalText.length },
      `Read ${terminalText.length} chars from terminal selection`,
    );

    const destinationBehavior = await this.clipboardRouter.resolveDestinationBehavior(logCtx);
    if (destinationBehavior === undefined) return { outcome: 'picker-cancelled' };

    const paddingMode = this.configReader.getPaddingMode(
      SETTING_SMART_PADDING_PASTE_CONTENT,
      DEFAULT_SMART_PADDING_PASTE_CONTENT,
    );

    await this.clipboardRouter.copyAndSendToDestination({
      control: {
        contentType: PasteContentType.Text,
        destinationBehavior,
      },
      content: {
        clipboard: terminalText,
        send: terminalText,
      },
      strategies: {
        sendFn: (text, basicStatusMessage) =>
          this.destinationManager.sendTextToDestination(text, basicStatusMessage, paddingMode),
        isEligibleFn: (destination, text) => destination.isEligibleForPasteContent(text),
      },
      contentName: formatMessage(MessageCode.CONTENT_NAME_SELECTED_TEXT),
      fnName: 'pasteTerminalSelectionToDestination',
    });

    return { outcome: 'success' };
  }

  /**
   * Bridge for R-L keybinding in terminal context.
   *
   * Delegates to pasteTerminalSelectionToDestination() (same as R-V),
   * then shows an informational tip nudging the user toward R-V directly.
   */
  async terminalLinkBridge(): Promise<void> {
    const logCtx = { fn: 'TerminalSelectionService.terminalLinkBridge' };
    this.logger.debug(logCtx, 'Bridging R-L to pasteTerminalSelectionToDestination');

    const result = await this.pasteTerminalSelectionToDestination();

    if (result.outcome === 'success') {
      this.ideAdapter.showInformationMessage(
        formatMessage(MessageCode.INFO_TERMINAL_LINK_BRIDGE_TIP),
      );
    }
  }

  /**
   * Guard for R-C keybinding in terminal context.
   *
   * R-C generates code location links, which require an editor selection.
   * In terminal context, show an error explaining this and suggest R-V instead.
   */
  terminalCopyLinkGuard(): void {
    const logCtx = { fn: 'TerminalSelectionService.terminalCopyLinkGuard' };
    this.logger.debug(logCtx, 'R-C pressed in terminal context');

    this.ideAdapter.showErrorMessage(
      formatMessage(MessageCode.ERROR_TERMINAL_COPY_LINK_NOT_SUPPORTED),
    );
  }
}
