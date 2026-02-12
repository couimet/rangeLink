import type { Logger } from 'barebone-logger';

import type { DestinationPicker } from '../destinations/DestinationPicker';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import { type BindOptions, MessageCode } from '../types';
import type { JumpToDestinationResult } from '../types/JumpToDestinationResult';

/**
 * Command handler for jumping to the bound destination.
 *
 * Orchestrates the jump flow:
 * - If bound: focuses the bound destination
 * - If not bound: shows picker, binds selection, then focuses
 *
 * All user feedback is handled internally via PasteDestinationManager.
 */
export class JumpToDestinationCommand {
  constructor(
    private readonly destinationManager: PasteDestinationManager,
    private readonly destinationPickerCommand: DestinationPicker,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'JumpToDestinationCommand.constructor' },
      'JumpToDestinationCommand initialized',
    );
  }

  async execute(): Promise<JumpToDestinationResult> {
    const logCtx = { fn: 'JumpToDestinationCommand.execute' };

    if (this.destinationManager.isBound()) {
      return this.focus(logCtx);
    }

    this.logger.debug(logCtx, 'No destination bound, showing picker');

    const pickerResult = await this.destinationPickerCommand.execute({
      noDestinationsMessageCode: MessageCode.INFO_JUMP_NO_DESTINATIONS_AVAILABLE,
      placeholderMessageCode: MessageCode.INFO_JUMP_QUICK_PICK_PLACEHOLDER,
      callerContext: logCtx,
    });

    switch (pickerResult.outcome) {
      case 'no-resource':
        this.logger.debug(logCtx, 'No destinations available');
        return { outcome: 'no-resource' };

      case 'cancelled':
        this.logger.debug(logCtx, 'User cancelled picker');
        return { outcome: 'cancelled' };

      case 'selected':
        return this.bindAndFocus(pickerResult.bindOptions, logCtx);

      default: {
        const _exhaustiveCheck: never = pickerResult;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: 'Unhandled picker outcome in JumpToDestinationCommand',
          functionName: 'JumpToDestinationCommand.execute',
          details: { pickerResult: _exhaustiveCheck },
        });
      }
    }
  }

  private async focus(logCtx: { fn: string }): Promise<JumpToDestinationResult> {
    this.logger.debug(logCtx, 'Destination already bound, focusing');
    const focusResult = await this.destinationManager.focusBoundDestination();

    if (!focusResult.success) {
      return { outcome: 'focus-failed', error: focusResult.error };
    }

    return { outcome: 'focused', destinationName: focusResult.value.destinationName };
  }

  private async bindAndFocus(
    bindOptions: BindOptions,
    logCtx: { fn: string },
  ): Promise<JumpToDestinationResult> {
    this.logger.debug(logCtx, 'Binding selected destination and focusing');
    const result = await this.destinationManager.bindAndFocus(bindOptions);

    if (!result.success) {
      this.logger.debug(logCtx, 'Bind and focus failed');
      return { outcome: 'focus-failed', error: result.error };
    }

    return { outcome: 'focused', destinationName: result.value.destinationName };
  }
}
