import type { Logger, LoggingContext } from 'barebone-logger';

import type { DestinationAvailabilityService } from '../destinations';
import {
  buildDestinationQuickPickItems,
  showTerminalPicker,
  TERMINAL_PICKER_SHOW_ALL,
  type TerminalPickerOptions,
} from '../destinations/utils';
import { RangeLinkExtensionError } from '../errors';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { type BindOptions, type DestinationQuickPickItem, MessageCode } from '../types';
import { formatMessage } from '../utils';

/**
 * Result of the destination picker command.
 * Returns the user's selection without performing any binding.
 *
 * Outcome values align with BindResultOutcome where applicable:
 * - 'cancelled' - user dismissed the picker
 * - 'no-resource' - no destinations available (aligns with BindResultOutcome)
 * - 'selected' - user made a selection (picker-specific, differs from 'bound')
 */
export type DestinationPickerResult =
  | { readonly outcome: 'selected'; readonly bindOptions: BindOptions }
  | { readonly outcome: 'cancelled' }
  | { readonly outcome: 'no-resource' };

/**
 * Internal result type that includes 'returned-to-main-picker' for loop control.
 * Not exposed publicly - execute() converts this to DestinationPickerResult.
 */
type InternalPickerResult =
  | DestinationPickerResult
  | { readonly outcome: 'returned-to-main-picker' };

/**
 * Context-specific options for executing the destination picker.
 * These vary based on the calling flow (paste vs jump).
 */
export interface DestinationPickerOptions {
  readonly noDestinationsMessageCode: MessageCode;
  readonly placeholderMessageCode: MessageCode;
  readonly callerContext: LoggingContext;
}

/**
 * Command handler for showing the destination picker.
 *
 * Shows a QuickPick with available destinations and returns the user's selection.
 * Does NOT perform binding - callers are responsible for calling bind() with the result.
 *
 * This separation of concerns eliminates the circular dependency between
 * picker and manager, enabling clean constructor injection.
 */
export class DestinationPickerCommand {
  constructor(
    private readonly vscodeAdapter: VscodeAdapter,
    private readonly availabilityService: DestinationAvailabilityService,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'DestinationPickerCommand.constructor' },
      'DestinationPickerCommand initialized',
    );
  }

  async execute(options: DestinationPickerOptions): Promise<DestinationPickerResult> {
    const { noDestinationsMessageCode, placeholderMessageCode, callerContext } = options;
    const logCtx = {
      ...callerContext,
      fn: `${callerContext.fn}::DestinationPickerCommand.execute`,
    };

    this.logger.debug(logCtx, 'Showing destination picker');

    const grouped = await this.availabilityService.getGroupedDestinationItems();

    const quickPickItems = buildDestinationQuickPickItems(grouped, (name) => name);

    if (quickPickItems.length === 0) {
      this.logger.debug(logCtx, 'No destinations available');
      await this.vscodeAdapter.showInformationMessage(formatMessage(noDestinationsMessageCode));
      return { outcome: 'no-resource' };
    }

    // Loop to support returning from secondary picker to main picker
    while (true) {
      this.logger.debug(
        { ...logCtx, availableCount: quickPickItems.length },
        `Showing quick pick with ${quickPickItems.length} items`,
      );

      const selected = await this.vscodeAdapter.showQuickPick(quickPickItems, {
        placeHolder: formatMessage(placeholderMessageCode),
      });

      if (!selected) {
        this.logger.debug(logCtx, 'User cancelled quick pick');
        return { outcome: 'cancelled' };
      }

      const result = await this.handleQuickPickSelection(selected, logCtx);

      if (result.outcome !== 'returned-to-main-picker') {
        return result;
      }

      this.logger.debug(logCtx, 'Returning to main destination picker');
    }
  }

  private async handleQuickPickSelection(
    selected: DestinationQuickPickItem,
    logCtx: LoggingContext,
  ): Promise<InternalPickerResult> {
    switch (selected.itemKind) {
      case 'bindable':
        this.logger.debug(
          { ...logCtx, bindOptions: selected.bindOptions },
          `User selected destination with bind options`,
        );
        return {
          outcome: 'selected',
          bindOptions: selected.bindOptions,
        };

      case 'terminal-more':
        this.logger.debug(logCtx, 'User selected "More terminals...", showing secondary picker');
        return this.showSecondaryTerminalPicker(logCtx);

      default: {
        const _exhaustiveCheck: never = selected;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_ITEM_KIND,
          message: 'Unhandled item kind in destination picker',
          functionName: 'DestinationPickerCommand.handleQuickPickSelection',
          details: { selectedItem: _exhaustiveCheck },
        });
      }
    }
  }

  private async showSecondaryTerminalPicker(logCtx: LoggingContext): Promise<InternalPickerResult> {
    const terminals = this.vscodeAdapter.terminals;
    const activeTerminal = this.vscodeAdapter.activeTerminal;

    const options: TerminalPickerOptions = {
      maxItemsBeforeMore: TERMINAL_PICKER_SHOW_ALL,
      title: formatMessage(MessageCode.TERMINAL_PICKER_TITLE),
      placeholder: formatMessage(MessageCode.TERMINAL_PICKER_PLACEHOLDER),
      activeDescription: formatMessage(MessageCode.TERMINAL_PICKER_ACTIVE_DESCRIPTION),
      moreTerminalsLabel: formatMessage(MessageCode.TERMINAL_PICKER_MORE_LABEL),
    };

    const result = await showTerminalPicker(
      terminals,
      activeTerminal,
      this.vscodeAdapter,
      options,
      this.logger,
      (terminal) => ({
        outcome: 'selected' as const,
        bindOptions: { kind: 'terminal' as const, terminal },
      }),
    );

    switch (result.outcome) {
      case 'selected':
        return result.result;
      case 'cancelled':
        this.logger.debug(logCtx, 'User cancelled secondary terminal picker');
        return { outcome: 'cancelled' };
      case 'returned-to-destination-picker':
        this.logger.debug(logCtx, 'User returned to destination picker from secondary');
        return { outcome: 'returned-to-main-picker' };
      default: {
        const _exhaustiveCheck: never = result;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: 'Unexpected terminal picker result outcome',
          functionName: 'DestinationPickerCommand.showSecondaryTerminalPicker',
          details: { result: _exhaustiveCheck },
        });
      }
    }
  }
}
