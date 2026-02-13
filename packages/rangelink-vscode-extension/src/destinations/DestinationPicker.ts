import type { Logger } from 'barebone-logger';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { MessageProvider } from '../ide/MessageProvider';
import type { QuickPickProvider } from '../ide/QuickPickProvider';
import { type DestinationQuickPickItem, MessageCode } from '../types';
import type { DestinationPickerResult } from '../types/DestinationPickerResult';
import { formatMessage, isSelectableQuickPickItem } from '../utils';

import type { DestinationAvailabilityService } from './DestinationAvailabilityService';
import { buildDestinationQuickPickItems, showTerminalPicker } from './utils';

/**
 * Internal result type that includes 'returned-to-main-picker' for loop control.
 * Not exposed publicly - pick() converts this to DestinationPickerResult.
 */
type InternalPickerResult =
  | DestinationPickerResult
  | { readonly outcome: 'returned-to-main-picker' };

/**
 * Context-specific options for the destination picker.
 * These vary based on the calling flow (paste vs jump).
 */
export interface DestinationPickerOptions {
  readonly noDestinationsMessageCode: MessageCode;
  readonly placeholderMessageCode: MessageCode;
}

/**
 * Shows a QuickPick with available destinations and returns the user's selection.
 * Does NOT perform binding — callers are responsible for calling bind() with the result.
 *
 * This separation of concerns eliminates the circular dependency between
 * picker and manager, enabling clean constructor injection.
 */
export class DestinationPicker {
  constructor(
    private readonly uiProvider: QuickPickProvider & MessageProvider,
    private readonly availabilityService: DestinationAvailabilityService,
    private readonly logger: Logger,
  ) {
    this.logger.debug({ fn: 'DestinationPicker.constructor' }, 'DestinationPicker initialized');
  }

  async pick(options: DestinationPickerOptions): Promise<DestinationPickerResult> {
    const { noDestinationsMessageCode, placeholderMessageCode } = options;
    const logCtx = { fn: 'DestinationPicker.pick' };

    this.logger.debug(logCtx, 'Showing destination picker');

    const grouped = await this.availabilityService.getGroupedDestinationItems();

    const quickPickItems = buildDestinationQuickPickItems(grouped, (name) => name);

    if (quickPickItems.length === 0) {
      this.logger.debug(logCtx, 'No destinations available');
      await this.uiProvider.showInformationMessage(formatMessage(noDestinationsMessageCode));
      return { outcome: 'no-resource' };
    }

    while (true) {
      this.logger.debug(
        { ...logCtx, availableCount: quickPickItems.length },
        `Showing quick pick with ${quickPickItems.length} items`,
      );

      const selected = await this.uiProvider.showQuickPick(quickPickItems, {
        placeHolder: formatMessage(placeholderMessageCode),
      });

      if (!isSelectableQuickPickItem<DestinationQuickPickItem>(selected)) {
        this.logger.debug(logCtx, 'User cancelled quick pick');
        return { outcome: 'cancelled' };
      }

      const result = await this.handleQuickPickSelection(selected, placeholderMessageCode);

      if (result.outcome !== 'returned-to-main-picker') {
        return result;
      }

      this.logger.debug(logCtx, 'Returning to main destination picker');
    }
  }

  private async handleQuickPickSelection(
    selected: DestinationQuickPickItem,
    placeholderMessageCode: MessageCode,
  ): Promise<InternalPickerResult> {
    const logCtx = { fn: 'DestinationPicker.handleQuickPickSelection' };

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
        return this.showSecondaryTerminalPicker(placeholderMessageCode);

      default: {
        const _exhaustiveCheck: never = selected;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_ITEM_KIND,
          message: 'Unhandled item kind in destination picker',
          functionName: 'DestinationPicker.handleQuickPickSelection',
          details: { selectedItem: _exhaustiveCheck },
        });
      }
    }
  }

  private async showSecondaryTerminalPicker(
    placeholderMessageCode: MessageCode,
  ): Promise<InternalPickerResult> {
    const logCtx = { fn: 'DestinationPicker.showSecondaryTerminalPicker' };
    const terminalItems = await this.availabilityService.getTerminalItems(Infinity);

    const result = await showTerminalPicker<InternalPickerResult>(
      terminalItems,
      this.uiProvider,
      {
        getPlaceholder: () => formatMessage(placeholderMessageCode),
        onSelected: (eligible) => ({
          outcome: 'selected' as const,
          bindOptions: { kind: 'terminal' as const, terminal: eligible.terminal },
        }),
        onDismissed: () => {
          this.logger.debug(logCtx, 'User returned from secondary terminal picker');
          return { outcome: 'returned-to-main-picker' as const };
        },
      },
      this.logger,
    );

    return result ?? { outcome: 'returned-to-main-picker' };
  }
}
