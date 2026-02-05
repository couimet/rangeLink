import type { Logger } from 'barebone-logger';

import type { DestinationAvailabilityService } from '../destinations/DestinationAvailabilityService';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import {
  showTerminalPicker,
  TERMINAL_PICKER_SHOW_ALL,
  type TerminalPickerOptions,
} from '../destinations/utils/showTerminalPicker';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  type BindableQuickPickItem,
  MessageCode,
  type TerminalBindOptions,
  type TerminalBindResult,
} from '../types';
import { formatMessage } from '../utils';

/**
 * Command handler for binding to a terminal via picker.
 *
 * Orchestrates the terminal selection flow:
 * - 0 terminals: Shows error message, returns 'no-resource'
 * - 1 terminal: Auto-binds to it (no picker shown)
 * - 2+ terminals: Shows picker, binds to selected terminal
 *
 * Success feedback is handled by PasteDestinationManager.bindTerminal().
 */
export class BindToTerminalCommand {
  constructor(
    private readonly vscodeAdapter: VscodeAdapter,
    private readonly availabilityService: DestinationAvailabilityService,
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

    const grouped = await this.availabilityService.getGroupedDestinationItems({
      destinationTypes: ['terminal'],
      terminalThreshold: Infinity,
    });
    const terminalItems = (grouped['terminal'] ??
      []) as BindableQuickPickItem<TerminalBindOptions>[];

    this.logger.debug(
      { ...logCtx, terminalCount: terminalItems.length },
      'Starting bind to terminal command',
    );

    if (terminalItems.length === 0) {
      this.logger.debug(logCtx, 'No terminals available');
      this.vscodeAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TERMINAL));
      return { outcome: 'no-resource' };
    }

    if (terminalItems.length === 1) {
      const terminal = terminalItems[0].bindOptions.terminal;
      this.logger.debug(
        { ...logCtx, terminalName: terminal.name },
        'Single terminal, auto-binding',
      );
      return this.destinationManager.bindTerminal(terminal);
    }

    const terminals = terminalItems.map((item) => item.bindOptions.terminal);
    const activeTerminal = terminalItems.find((item) => item.isActive)?.bindOptions.terminal;

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
