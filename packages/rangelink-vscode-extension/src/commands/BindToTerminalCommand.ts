import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import {
  showTerminalPicker,
  TERMINAL_PICKER_SHOW_ALL,
  type TerminalPickerOptions,
} from '../destinations/utils/showTerminalPicker';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types';
import { formatMessage } from '../utils';

/**
 * Result of the bind-to-terminal command.
 */
export type BindToTerminalResult =
  | { readonly outcome: 'bound'; readonly terminalName: string }
  | { readonly outcome: 'no-terminals' }
  | { readonly outcome: 'cancelled' }
  | { readonly outcome: 'bind-failed' };

/**
 * Command handler for binding to a terminal via picker.
 *
 * Orchestrates the terminal selection flow:
 * - 0 terminals: Returns 'no-terminals' (caller handles user feedback)
 * - 1 terminal: Auto-binds to it (no picker shown)
 * - 2+ terminals: Shows picker, binds to selected terminal
 *
 * Success feedback is handled by PasteDestinationManager.bindTerminal().
 * Error feedback (no-terminals, bind-failed) is caller's responsibility.
 */
export class BindToTerminalCommand {
  constructor(
    private readonly vscodeAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'BindToTerminalCommand.constructor' },
      'BindToTerminalCommand initialized',
    );
  }

  async execute(): Promise<BindToTerminalResult> {
    const logCtx = { fn: 'BindToTerminalCommand.execute' };

    const terminals = this.vscodeAdapter.terminals;
    const activeTerminal = this.vscodeAdapter.activeTerminal;

    this.logger.debug(
      { ...logCtx, terminalCount: terminals.length },
      'Starting bind to terminal command',
    );

    if (terminals.length === 0) {
      this.logger.debug(logCtx, 'No terminals available');
      return { outcome: 'no-terminals' };
    }

    if (terminals.length === 1) {
      this.logger.debug(
        { ...logCtx, terminalName: terminals[0].name },
        'Single terminal, auto-binding',
      );
      return this.bindTerminalAndBuildResult(terminals[0]);
    }

    const options: TerminalPickerOptions = {
      maxItemsBeforeMore: TERMINAL_PICKER_SHOW_ALL,
      title: formatMessage(MessageCode.TERMINAL_PICKER_TITLE),
      placeholder: formatMessage(MessageCode.TERMINAL_PICKER_BIND_ONLY_PLACEHOLDER),
      activeDescription: formatMessage(MessageCode.TERMINAL_PICKER_ACTIVE_DESCRIPTION),
      moreTerminalsLabel: formatMessage(MessageCode.TERMINAL_PICKER_MORE_LABEL),
      formatMoreDescription: (count) =>
        formatMessage(MessageCode.TERMINAL_PICKER_MORE_TERMINALS_DESCRIPTION, { count }),
    };

    const result = await showTerminalPicker(
      terminals,
      activeTerminal,
      this.vscodeAdapter,
      options,
      this.logger,
      async (terminal) => {
        this.logger.debug(
          { ...logCtx, terminalName: terminal.name },
          `Binding to terminal "${terminal.name}"`,
        );
        return this.bindTerminalAndBuildResult(terminal);
      },
    );

    switch (result.outcome) {
      case 'selected':
        return result.result;
      case 'cancelled':
      case 'returned-to-destination-picker':
        this.logger.debug(logCtx, 'User cancelled terminal picker');
        return { outcome: 'cancelled' };
      default: {
        const _exhaustiveCheck: never = result;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: 'Unexpected terminal picker result outcome',
          functionName: 'BindToTerminalCommand.execute',
          details: { result: _exhaustiveCheck },
        });
      }
    }
  }

  private async bindTerminalAndBuildResult(
    terminal: vscode.Terminal,
  ): Promise<BindToTerminalResult> {
    const result = await this.destinationManager.bind({ type: 'terminal', terminal });
    return result.success
      ? { outcome: 'bound', terminalName: result.value.destinationName }
      : { outcome: 'bind-failed' };
  }
}
