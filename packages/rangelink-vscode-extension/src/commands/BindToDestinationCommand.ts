import type { Logger } from 'barebone-logger';

import type { DestinationPicker } from '../destinations/DestinationPicker';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { resolveBoundTerminalProcessId } from '../destinations/utils';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import { MessageCode } from '../types';
import type { QuickPickBindResult } from '../types/QuickPickBindResult';
import { isEditorDestination } from '../utils';

/**
 * Command handler for binding to a destination via picker.
 *
 * Shows the destination picker and binds to the selected destination.
 * Smart bind handles the already-bound case (confirmation dialog).
 */
export class BindToDestinationCommand {
  constructor(
    private readonly destinationManager: PasteDestinationManager,
    private readonly destinationPicker: DestinationPicker,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'BindToDestinationCommand.constructor' },
      'BindToDestinationCommand initialized',
    );
  }

  async execute(): Promise<QuickPickBindResult> {
    const logCtx = { fn: 'BindToDestinationCommand.execute' };

    this.logger.debug(logCtx, 'Showing destination picker for binding');

    const boundDest = this.destinationManager.getBoundDestination();
    const boundEditorDest = isEditorDestination(boundDest) ? boundDest : undefined;
    const boundTerminalProcessId = await resolveBoundTerminalProcessId(this.destinationManager);

    const pickerResult = await this.destinationPicker.pick({
      noDestinationsMessageCode: MessageCode.INFO_BIND_NO_DESTINATIONS_AVAILABLE,
      placeholderMessageCode: MessageCode.INFO_BIND_QUICK_PICK_PLACEHOLDER,
      ...(boundEditorDest && {
        boundFileUriString: boundEditorDest.resource.uri.toString(),
        boundFileViewColumn: boundEditorDest.resource.viewColumn,
      }),
      ...(boundTerminalProcessId !== undefined && { boundTerminalProcessId }),
    });

    switch (pickerResult.outcome) {
      case 'no-resource':
        this.logger.debug(logCtx, 'No destinations available');
        return { outcome: 'no-resource' };

      case 'cancelled':
        this.logger.debug(logCtx, 'User cancelled picker');
        return { outcome: 'cancelled' };

      case 'selected': {
        this.logger.debug(logCtx, 'Binding selected destination');
        const bindResult = await this.destinationManager.bind(pickerResult.bindOptions);

        if (!bindResult.success) {
          this.logger.debug(logCtx, 'Bind failed');
          return { outcome: 'bind-failed', error: bindResult.error };
        }

        return { outcome: 'bound', bindInfo: bindResult.value };
      }

      default: {
        const _exhaustiveCheck: never = pickerResult;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_PICKER_OUTCOME,
          message: 'Unhandled picker outcome in BindToDestinationCommand',
          functionName: 'BindToDestinationCommand.execute',
          details: { pickerResult: _exhaustiveCheck },
        });
      }
    }
  }
}
