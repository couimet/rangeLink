import type { Logger } from 'barebone-logger';

import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { MessageCode } from '../types';

import type { DestinationPickerCommand } from './DestinationPickerCommand';

/**
 * Result of the jump-to-destination command.
 */
export type JumpToDestinationResult =
  | { readonly outcome: 'focused'; readonly destinationName: string }
  | { readonly outcome: 'no-destinations' }
  | { readonly outcome: 'cancelled' }
  | { readonly outcome: 'focus-failed'; readonly error: RangeLinkExtensionError };

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
    private readonly destinationPickerCommand: DestinationPickerCommand,
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
      this.logger.debug(logCtx, 'Destination already bound, focusing');
      return this.focusAndBuildResult();
    }

    this.logger.debug(logCtx, 'No destination bound, showing picker');

    const pickerResult = await this.destinationPickerCommand.execute({
      noDestinationsMessageCode: MessageCode.INFO_JUMP_NO_DESTINATIONS_AVAILABLE,
      placeholderMessageCode: MessageCode.INFO_JUMP_QUICK_PICK_PLACEHOLDER,
      callerContext: logCtx,
    });

    if (pickerResult.outcome === 'no-destinations') {
      return { outcome: 'no-destinations' };
    }

    if (pickerResult.outcome === 'cancelled') {
      this.logger.debug(logCtx, 'User cancelled picker');
      return { outcome: 'cancelled' };
    }

    this.logger.debug(logCtx, 'Binding selected destination and focusing');
    const result = await this.destinationManager.bindAndFocus(pickerResult.bindOptions);

    if (!result.success) {
      this.logger.debug(logCtx, 'Bind and focus failed');
      return { outcome: 'focus-failed', error: result.error };
    }

    return { outcome: 'focused', destinationName: result.value.destinationName };
  }

  private async focusAndBuildResult(): Promise<JumpToDestinationResult> {
    const focusResult = await this.destinationManager.focusBoundDestination();

    if (!focusResult.success) {
      return { outcome: 'focus-failed', error: focusResult.error };
    }

    return { outcome: 'focused', destinationName: focusResult.value.destinationName };
  }
}
