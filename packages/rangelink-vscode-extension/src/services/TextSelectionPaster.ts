import type { Logger } from 'barebone-logger';

import type { ConfigReader } from '../config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_CONTENT,
  SETTING_SMART_PADDING_PASTE_CONTENT,
} from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { MessageCode, PasteContentType } from '../types';
import { formatMessage } from '../utils';

import type { ClipboardRouter } from './ClipboardRouter';
import type { SelectionValidator } from './SelectionValidator';

/**
 * Pastes the current editor text selection to the bound destination.
 * Supports single and multi-selection (concatenates with newlines).
 */
export class TextSelectionPaster {
  constructor(
    private readonly destinationManager: PasteDestinationManager,
    private readonly configReader: ConfigReader,
    private readonly clipboardRouter: ClipboardRouter,
    private readonly selectionValidator: SelectionValidator,
    private readonly logger: Logger,
  ) {}

  async pasteSelectedTextToDestination(): Promise<void> {
    const logCtx = { fn: 'TextSelectionPaster.pasteSelectedTextToDestination' };

    const validated = this.selectionValidator.validateSelectionsAndShowError();
    if (!validated) {
      return;
    }

    const { editor, selections } = validated;

    const selectedTexts = selections.map((s) => editor.document.getText(s));
    const content = selectedTexts.join('\n');

    this.logger.debug(
      { ...logCtx, selectionCount: selectedTexts.length, contentLength: content.length },
      `Extracted ${content.length} chars from ${selectedTexts.length} selection(s)`,
    );

    const paddingMode = this.configReader.getPaddingMode(
      SETTING_SMART_PADDING_PASTE_CONTENT,
      DEFAULT_SMART_PADDING_PASTE_CONTENT,
    );

    const destinationBehavior = await this.clipboardRouter.resolveDestinationBehavior(logCtx);
    if (destinationBehavior === undefined) return;

    await this.clipboardRouter.copyAndSendToDestination({
      control: {
        contentType: PasteContentType.Text,
        destinationBehavior,
      },
      content: {
        clipboard: content,
        send: content,
        sourceUri: editor.document.uri,
      },
      strategies: {
        sendFn: (text, basicStatusMessage) =>
          this.destinationManager.sendTextToDestination(text, basicStatusMessage, paddingMode),
        isEligibleFn: (destination, text) => destination.isEligibleForPasteContent(text),
      },
      contentName: formatMessage(MessageCode.CONTENT_NAME_SELECTED_TEXT),
      fnName: 'pasteSelectedTextToDestination',
    });
  }
}
