import type { Logger, LoggingContext } from 'barebone-logger';

import type { ClipboardService } from '../clipboard/ClipboardService';
import type {
  DestinationBinder,
  DestinationPicker,
  PasteDestination,
  BoundSession,
} from '../destinations';
import { resolveBoundTerminalProcessId } from '../destinations/utils';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { OperationFeedbackProvider } from '../feedback';
import type { PasteContext, PasteSendOutcome } from '../feedback';
import type { ClipboardWriter } from '../ide/ClipboardProvider';
import { AutoPasteResult, MessageCode, type QuickPickBindResult, type SendOptions } from '../types';
import { formatMessage, isEditorDestination, isSameFileDestination } from '../utils';

/**
 * Routes content through clipboard and to a bound destination.
 * Handles clipboard preservation, eligibility checks, self-paste detection,
 * destination resolution (picker if unbound), and delegates feedback to OperationFeedbackProvider.
 */
export class SendRouter {
  constructor(
    private readonly clipboardWriter: ClipboardWriter,
    private readonly binder: DestinationBinder,
    private readonly session: BoundSession,
    private readonly destinationPicker: DestinationPicker,
    private readonly clipboardService: ClipboardService,
    private readonly feedbackProvider: OperationFeedbackProvider,
    private readonly logger: Logger,
  ) {}

  /**
   * Ensure a destination is bound, showing the picker if needed.
   * Returns true if a destination is available (already bound or user picked one).
   */
  async resolveDestination(logCtx: LoggingContext): Promise<boolean> {
    if (!this.session.isSet()) {
      this.logger.debug(logCtx, 'No destination bound, showing quick pick');
      const pickerResult = await this.showPickerAndBind();
      if (pickerResult.outcome !== 'bound') {
        this.logger.debug(
          { ...logCtx, outcome: pickerResult.outcome },
          'Picker did not bind, aborting',
        );
        return false;
      }
    }
    return true;
  }

  /**
   * Routes content through clipboard and to the bound destination.
   * Handles clipboard preservation, eligibility, self-paste detection, and feedback.
   */
  async sendToDestination<T>(options: SendOptions<T>): Promise<void> {
    const shouldRoute = this.session.isSet();
    if (shouldRoute) {
      let outcome: PasteSendOutcome | undefined;
      const routeResult = await this.clipboardService.route(
        async () => {
          outcome = await this.executeSend(options);
        },
        () => this.shouldRestoreClipboard(outcome),
      );
      if (!routeResult.success) {
        this.logger.error(
          { fn: 'SendRouter.sendToDestination', error: routeResult.error },
          'Clipboard routing failed',
        );
        this.feedbackProvider.provideSendFeedback(this.buildPasteContext(options), {
          kind: 'clipboard-preservation-failed',
        });
        return;
      }
      if (outcome !== undefined) {
        this.feedbackProvider.provideSendFeedback(this.buildPasteContext(options), outcome);
      }
    } else {
      await this.executeSend(options);
    }
  }

  private buildPasteContext<T>(options: SendOptions<T>): PasteContext {
    const destination = this.session.get()!;
    return {
      contentType: options.contentNameCode,
      destination: {
        kind: destination.id,
        label: destination.rawLabel,
        displayName: destination.displayName,
      },
    };
  }

  private async executeSend<T>(options: SendOptions<T>): Promise<PasteSendOutcome | undefined> {
    const { content, strategies, fnName } = options;

    if (!this.session.isSet()) {
      await this.clipboardWriter.writeTextToClipboard(content.clipboard);
      this.logger.info({ fn: fnName }, 'No destination bound - copied to clipboard only');
      return undefined;
    }

    const destination = this.session.get()!;
    const displayName = destination.displayName || 'destination';

    const selfPasteOutcome = await this.checkSelfPaste(options, destination);
    if (selfPasteOutcome !== undefined) {
      return selfPasteOutcome;
    }

    await this.clipboardWriter.writeTextToClipboard(content.clipboard);

    const isEligible = await strategies.isEligibleFn(destination, content.send);
    if (!isEligible) {
      this.logger.debug(
        { fn: fnName, boundDestination: displayName },
        'Content not eligible for paste - skipping auto-paste',
      );
      return undefined;
    }

    this.logger.debug(
      { fn: fnName, boundDestination: displayName },
      `Attempting to send content to bound destination: ${displayName}`,
    );

    const pasteSucceeded = await strategies.sendFn(content.send);

    return this.computeOutcome(destination, pasteSucceeded);
  }

  private async checkSelfPaste<T>(
    options: SendOptions<T>,
    destination: PasteDestination,
  ): Promise<PasteSendOutcome | undefined> {
    const { content, fnName, selfPastePolicy, writeClipboardOnSelfPasteBlock } = options;
    if (!content.sourceUri) return undefined;

    const isSameFile = isSameFileDestination(
      content.sourceUri,
      destination,
      content.sourceViewColumn,
    );
    if (!isSameFile) return undefined;

    const policyIsDefault = !selfPastePolicy;
    const clipboardOnBlockIsDefault = writeClipboardOnSelfPasteBlock === undefined;
    if (policyIsDefault || clipboardOnBlockIsDefault) {
      this.logger.debug(
        {
          fn: fnName,
          selfPastePolicy: selfPastePolicy ?? 'block-on-uri',
          writeClipboardOnSelfPasteBlock,
          usedDefaults: {
            selfPastePolicy: policyIsDefault,
            writeClipboardOnSelfPasteBlock: clipboardOnBlockIsDefault,
          },
        },
        'Self-paste policy resolution',
      );
    }

    if (!selfPastePolicy || selfPastePolicy === 'block-on-uri') {
      await this.clipboardWriter.writeTextToClipboard(content.clipboard);
      this.logger.info({ fn: fnName }, 'Self-paste detected - copying to clipboard');
      return {
        kind: 'self-paste-blocked',
        destinationKind: destination.id,
        clipboardWritten: true,
        toastMessage: formatMessage(MessageCode.INFO_SELF_PASTE_LINK_SKIPPED),
      };
    }

    // block-on-editor-selection: only block when bound editor has active selection
    if (!destination.editorHasActiveSelection?.()) return undefined;

    const shouldWriteClipboard = writeClipboardOnSelfPasteBlock === true;
    if (shouldWriteClipboard) {
      await this.clipboardWriter.writeTextToClipboard(content.clipboard);
    }
    this.logger.info({ fn: fnName }, 'Self-paste blocked: bound editor has active selection');
    const messageCode = shouldWriteClipboard
      ? MessageCode.INFO_SELF_PASTE_FILE_PATH_BLOCKED_BY_SELECTION
      : MessageCode.INFO_SELF_PASTE_SELECTED_TEXT_BLOCKED_BY_SELECTION;
    return {
      kind: 'self-paste-blocked',
      destinationKind: destination.id,
      clipboardWritten: shouldWriteClipboard,
      toastMessage: formatMessage(messageCode),
    };
  }

  private computeOutcome(destination: PasteDestination, pasteSucceeded: boolean): PasteSendOutcome {
    if (pasteSucceeded) {
      const successInstruction = destination.getUserInstruction?.(AutoPasteResult.Success);
      if (successInstruction !== undefined) {
        return { kind: 'sent-manual', instruction: successInstruction };
      }
      return { kind: 'sent-automatic' };
    }

    const failureInstruction = destination.getUserInstruction?.(AutoPasteResult.Failure);
    if (failureInstruction !== undefined) {
      return { kind: 'failed-manual', instruction: failureInstruction };
    }
    return { kind: 'failed-automatic', destinationKind: destination.id };
  }

  /**
   * Determine whether clipboard should be restored after a send operation.
   *
   * Never restores for self-paste-blocked outcomes that already wrote the
   * clipboard — the written content must survive. Otherwise delegates to
   * PasteDestinationManager's restoration logic.
   */
  private shouldRestoreClipboard(outcome: PasteSendOutcome | undefined): boolean {
    if (outcome?.kind === 'self-paste-blocked' && outcome.clipboardWritten) {
      return false;
    }
    return this.session.isClipboardRestorationApplicable(
      outcome?.kind === 'sent-automatic' || outcome?.kind === 'sent-manual',
    );
  }

  private async showPickerAndBind(): Promise<QuickPickBindResult> {
    const logCtx = { fn: 'SendRouter.showPickerAndBind' };

    const boundDest = this.session.get();
    // Dynamic read — the bound destination may change after the picker resolves,
    // so resolveBoundTerminalProcessId must re-read current state at call time
    // rather than using the snapshot captured in boundDest above.
    const boundTerminalProcessId = await resolveBoundTerminalProcessId(() => this.session.get());

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
        const bindResult = await this.binder.bind(result.bindOptions);
        if (!bindResult.success) {
          this.logger.error(
            { ...logCtx, error: bindResult.error },
            'Binding failed - no action taken',
          );
          this.feedbackProvider.showError(formatMessage(MessageCode.ERROR_BIND_FAILED));
          return { outcome: 'bind-failed', error: bindResult.error };
        }
        return { outcome: 'bound', bindInfo: bindResult.value };
      }

      default: {
        const _exhaustiveCheck: never = result;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_PICKER_OUTCOME,
          message: 'Unexpected picker result outcome',
          functionName: 'SendRouter.showPickerAndBind',
          details: { result: _exhaustiveCheck },
        });
      }
    }
  }
}
