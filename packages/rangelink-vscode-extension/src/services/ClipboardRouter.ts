import type { Logger, LoggingContext } from 'barebone-logger';

import type { ClipboardPreserver } from '../clipboard/ClipboardPreserver';
import type { DestinationPicker, PasteDestinationManager } from '../destinations';
import { resolveBoundTerminalProcessId } from '../destinations/utils';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  type CopyAndSendOptions,
  DestinationBehavior,
  MessageCode,
  PasteContentType,
  type QuickPickBindResult,
} from '../types';
import { isEditorDestination } from '../utils';
import { formatMessage, isSameFileDestination } from '../utils';

/**
 * Routes content through clipboard and optionally to a bound destination.
 * Handles clipboard preservation, eligibility checks, self-paste detection,
 * destination resolution (picker if unbound), and status feedback.
 */
export class ClipboardRouter {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
    private readonly destinationPicker: DestinationPicker,
    private readonly clipboardPreserver: ClipboardPreserver,
    private readonly logger: Logger,
  ) {}

  /**
   * Routes copy-and-send through clipboard preservation when the destination
   * consumes the clipboard as a transport mechanism.
   */
  async copyAndSendToDestination<T>(options: CopyAndSendOptions<T>): Promise<void> {
    const shouldPreserve =
      options.control.destinationBehavior !== DestinationBehavior.ClipboardOnly &&
      this.destinationManager.isBound();
    if (shouldPreserve) {
      await this.clipboardPreserver.preserve(() => this.executeCopyAndSend(options));
    } else {
      await this.executeCopyAndSend(options);
    }
  }

  /**
   * Resolves destination behavior for a Send command.
   * Shows picker if no destination is bound.
   * Returns undefined when the picker did not produce a usable destination.
   */
  async resolveDestinationBehavior(
    logCtx: LoggingContext,
  ): Promise<DestinationBehavior | undefined> {
    if (!this.destinationManager.isBound()) {
      this.logger.debug(logCtx, 'No destination bound, showing quick pick');
      const pickerResult = await this.showPickerAndBind();
      if (pickerResult.outcome !== 'bound' && pickerResult.outcome !== 'bound-no-paste') {
        this.logger.debug(
          { ...logCtx, outcome: pickerResult.outcome },
          'Picker did not bind, aborting',
        );
        return undefined;
      }
      if (pickerResult.outcome === 'bound-no-paste') {
        return DestinationBehavior.ClipboardOnly;
      }
    }
    return DestinationBehavior.BoundDestination;
  }

  private async executeCopyAndSend<T>(options: CopyAndSendOptions<T>): Promise<void> {
    const { control, content, strategies, contentName, fnName } = options;

    await this.ideAdapter.writeTextToClipboard(content.clipboard);

    const basicStatusMessage = formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, {
      linkTypeName: contentName,
    });

    const shouldSkipDestination =
      control.destinationBehavior === DestinationBehavior.ClipboardOnly ||
      !this.destinationManager.isBound();

    if (shouldSkipDestination) {
      const reason =
        control.destinationBehavior === DestinationBehavior.ClipboardOnly
          ? 'Skipping destination (clipboard-only command)'
          : 'No destination bound - copied to clipboard only';
      this.logger.info({ fn: fnName }, reason);
      this.ideAdapter.setStatusBarMessage(basicStatusMessage);
      return;
    }

    const destination = this.destinationManager.getBoundDestination()!;
    const displayName = destination.displayName || 'destination';

    const isEligible = await strategies.isEligibleFn(destination, content.send);
    if (!isEligible) {
      this.logger.debug(
        { fn: fnName, boundDestination: displayName },
        'Content not eligible for paste - skipping auto-paste',
      );
      this.ideAdapter.setStatusBarMessage(basicStatusMessage);
      return;
    }

    if (content.sourceUri && isSameFileDestination(content.sourceUri, destination)) {
      this.logger.info({ fn: fnName }, 'Self-paste detected - skipping auto-paste');
      const selfPasteMessageCodes: Record<PasteContentType, MessageCode> = {
        [PasteContentType.Link]: MessageCode.INFO_SELF_PASTE_LINK_SKIPPED,
        [PasteContentType.Text]: MessageCode.INFO_SELF_PASTE_CONTENT_SKIPPED,
      };
      const selfPasteMessage = formatMessage(selfPasteMessageCodes[control.contentType]);
      this.ideAdapter.showInformationMessage(selfPasteMessage);
      this.ideAdapter.setStatusBarMessage(basicStatusMessage);
      return;
    }

    this.logger.debug(
      { fn: fnName, boundDestination: displayName },
      `Attempting to send content to bound destination: ${displayName}`,
    );

    await strategies.sendFn(content.send, basicStatusMessage);
  }

  private async showPickerAndBind(): Promise<QuickPickBindResult> {
    const logCtx = { fn: 'ClipboardRouter.showPickerAndBind' };

    const boundDest = this.destinationManager.getBoundDestination();
    const boundTerminalProcessId = await resolveBoundTerminalProcessId(this.destinationManager);

    const editorPickerOptions = isEditorDestination(boundDest)
      ? {
          boundFileUriString: boundDest.resource.uri.toString(),
          boundFileViewColumn: boundDest.resource.viewColumn,
        }
      : {};

    const result = await this.destinationPicker.pick({
      noDestinationsMessageCode: MessageCode.INFO_PASTE_CONTENT_NO_DESTINATIONS_AVAILABLE,
      placeholderMessageCode: MessageCode.INFO_PASTE_CONTENT_QUICK_PICK_DESTINATIONS_CHOOSE_BELOW,
      ...editorPickerOptions,
      ...(boundTerminalProcessId !== undefined && { boundTerminalProcessId }),
    });

    switch (result.outcome) {
      case 'no-resource':
        this.logger.info(logCtx, 'No destinations available - no action taken');
        return { outcome: 'no-resource' };

      case 'cancelled':
        this.logger.info(logCtx, 'User cancelled quick pick - no action taken');
        return { outcome: 'cancelled' };

      case 'selected': {
        const bindResult = await this.destinationManager.bind(result.bindOptions);
        if (!bindResult.success) {
          this.logger.error(
            { ...logCtx, error: bindResult.error },
            'Binding failed - no action taken',
          );
          this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_BIND_FAILED));
          return { outcome: 'bind-failed', error: bindResult.error };
        }
        if (bindResult.value.suppressAutoPaste) {
          this.logger.debug(
            logCtx,
            'Bind requested auto-paste suppression — returning bound-no-paste',
          );
          return { outcome: 'bound-no-paste', bindInfo: bindResult.value };
        }
        return { outcome: 'bound', bindInfo: bindResult.value };
      }

      default: {
        const _exhaustiveCheck: never = result;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_PICKER_OUTCOME,
          message: 'Unexpected picker result outcome',
          functionName: 'ClipboardRouter.showPickerAndBind',
          details: { result: _exhaustiveCheck },
        });
      }
    }
  }
}
