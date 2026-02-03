import type { Logger } from 'barebone-logger';

import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { getEligibleTerminals } from '../destinations/utils/getEligibleTerminals';
import {
  showTerminalPicker,
  TERMINAL_PICKER_SHOW_ALL,
  type TerminalPickerOptions,
} from '../destinations/utils/showTerminalPicker';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode, type TerminalBindResult } from '../types';
import { formatMessage } from '../utils';

/**
 * Command handler for binding to a terminal via picker.
 *
 * Orchestrates the terminal selection flow:
 * - 0 terminals: Shows error message, returns 'no-terminals'
 * - 1 terminal: Auto-binds to it (no picker shown)
 * - 2+ terminals: Shows picker, binds to selected terminal
 *
 * Success feedback is handled by PasteDestinationManager.bindTerminalWithReference().
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

  async execute(): Promise<TerminalBindResult> {
    const logCtx = { fn: 'BindToTerminalCommand.execute' };

    const eligibleTerminals = getEligibleTerminals(this.vscodeAdapter);

    this.logger.debug(
      { ...logCtx, terminalCount: eligibleTerminals.length },
      'Starting bind to terminal command',
    );

    if (eligibleTerminals.length === 0) {
      this.logger.debug(logCtx, 'No terminals available');
      this.vscodeAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TERMINAL));
      return { outcome: 'no-resource' };
    }

    if (eligibleTerminals.length === 1) {
      this.logger.debug(
        { ...logCtx, terminalName: eligibleTerminals[0].name },
        'Single terminal, auto-binding',
      );
      return this.destinationManager.bindTerminal(eligibleTerminals[0].terminal);
    }

    const terminals = eligibleTerminals.map((et) => et.terminal);
    const activeTerminal = eligibleTerminals.find((et) => et.isActive)?.terminal;

    const options: TerminalPickerOptions = {
      maxItemsBeforeMore: TERMINAL_PICKER_SHOW_ALL,
      title: formatMessage(MessageCode.TERMINAL_PICKER_TITLE),
      placeholder: formatMessage(MessageCode.TERMINAL_PICKER_BIND_ONLY_PLACEHOLDER),
      activeDescription: formatMessage(MessageCode.TERMINAL_PICKER_ACTIVE_DESCRIPTION),
      moreTerminalsLabel: formatMessage(MessageCode.TERMINAL_PICKER_MORE_LABEL),
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
        return this.destinationManager.bindTerminal(terminal);
      },
    );

    switch (result.outcome) {
      case 'selected':
        return result.result;
      case 'cancelled':
      case 'returned-to-destination-picker':
        this.logger.debug(
          { ...logCtx, pickerOutcome: result.outcome },
          'User cancelled terminal picker',
        );
        return { outcome: 'cancelled' };
      default: {
        const _exhaustiveCheck: never = result;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_PICKER_OUTCOME,
          message: 'Unexpected terminal picker result outcome',
          functionName: 'BindToTerminalCommand.execute',
          details: { result: _exhaustiveCheck },
        });
      }
    }
  }
}
