import type { Logger, LoggingContext } from '@couimet/logger-contract';

import type { ClipboardService } from '../clipboard/ClipboardService';
import type { ConfigReader } from '../config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_CONTENT,
  SETTING_SMART_PADDING_PASTE_CONTENT,
  VSCODE_CMD_TERMINAL_COPY_SELECTION,
} from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode, PasteContentType, type TerminalPasteResult } from '../types';
import { applySmartPadding, formatMessage } from '../utils';

import type { SendRouter } from './SendRouter';

interface CaptureErrorInfo {
  readonly logMessage: string;
  readonly messageCode: MessageCode;
  readonly outcome: 'copy-command-failed' | 'clipboard-read-failed';
}

const COPY_FAILURE: CaptureErrorInfo = {
  logMessage: 'executeCommand(terminal.copySelection) threw',
  messageCode: MessageCode.ERROR_TERMINAL_COPY_COMMAND_FAILED,
  outcome: 'copy-command-failed',
};

const CAPTURE_FAILURE: CaptureErrorInfo = {
  logMessage: 'Clipboard read failed during capture',
  messageCode: MessageCode.ERROR_TERMINAL_CLIPBOARD_READ_FAILED,
  outcome: 'clipboard-read-failed',
};

/**
 * Handles terminal selection pasting, the R-L bridge in terminal context,
 * and the R-C guard that prevents link generation from terminals.
 */
export class TerminalSelectionService {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
    private readonly configReader: ConfigReader,
    private readonly clipboardService: ClipboardService,
    private readonly sendRouter: SendRouter,
    private readonly logger: Logger,
  ) {}

  async pasteTerminalSelectionToDestination(): Promise<TerminalPasteResult> {
    const logCtx: LoggingContext = {
      fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination',
    };

    const activeTerminal = this.ideAdapter.activeTerminal;
    if (!activeTerminal) {
      this.logger.debug(logCtx, 'No active terminal');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TERMINAL));
      return { outcome: 'no-active-terminal' };
    }

    logCtx.terminalName = activeTerminal.name;

    const captureResult = await this.clipboardService.capture(
      () => this.ideAdapter.executeCommand(VSCODE_CMD_TERMINAL_COPY_SELECTION),
      logCtx,
    );

    if (!captureResult.success) {
      const error = captureResult.error;
      const isCopyFailure =
        error.code === RangeLinkExtensionErrorCodes.CLIPBOARD_CAPTURE_EXECUTION_FAILED;
      const errorInfo = isCopyFailure ? COPY_FAILURE : CAPTURE_FAILURE;

      this.logger.error({ ...logCtx, error, isCopyFailure }, errorInfo.logMessage);
      this.ideAdapter.showErrorMessage(formatMessage(errorInfo.messageCode));
      return { outcome: errorInfo.outcome, error };
    }

    const terminalText = captureResult.value.clipboard;

    if (!terminalText) {
      this.logger.debug(logCtx, 'No terminal text after clipboard roundtrip');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_TERMINAL_TEXT_SELECTED));
      return { outcome: 'no-text-selected' };
    }

    this.logger.debug(
      { ...logCtx, contentLength: terminalText.length },
      `Read ${terminalText.length} chars from terminal selection`,
    );

    const resolved = await this.sendRouter.resolveDestination(logCtx);
    if (!resolved) return { outcome: 'picker-cancelled' };

    const paddingMode = this.configReader.getPaddingMode(
      SETTING_SMART_PADDING_PASTE_CONTENT,
      DEFAULT_SMART_PADDING_PASTE_CONTENT,
    );

    const paddedText = applySmartPadding(terminalText, paddingMode);

    await this.sendRouter.sendToDestination({
      control: {
        contentType: PasteContentType.Text,
      },
      content: {
        clipboard: paddedText,
        send: paddedText,
      },
      strategies: {
        sendFn: (text) => this.destinationManager.sendTextToDestination(text),
        isEligibleFn: (destination, text) => destination.isEligibleForPasteContent(text),
      },
      contentNameCode: MessageCode.CONTENT_NAME_SELECTED_TEXT,
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
