import type { Logger } from 'barebone-logger';

import type { ConfigReader } from '../config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_CONTENT,
  SETTING_SMART_PADDING_PASTE_CONTENT,
} from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { MessageCode, PasteContentType } from '../types';
import { applySmartPadding } from '../utils';

import type { SelectionValidator } from './SelectionValidator';
import type { SendRouter } from './SendRouter';

/**
 * Pastes the current editor text selection to the bound destination.
 * Supports single and multi-selection (concatenates with newlines).
 */
export class TextSelectionPaster {
  constructor(
    private readonly destinationManager: PasteDestinationManager,
    private readonly configReader: ConfigReader,
    private readonly sendRouter: SendRouter,
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

    const resolved = await this.sendRouter.resolveDestination(logCtx);
    if (!resolved) return;

    const paddedContent = applySmartPadding(content, paddingMode);

    await this.sendRouter.sendToDestination({
      control: {
        contentType: PasteContentType.Text,
      },
      content: {
        clipboard: paddedContent,
        send: paddedContent,
        sourceUri: editor.document.uri,
        sourceViewColumn: editor.viewColumn,
      },
      strategies: {
        sendFn: (text) => this.destinationManager.sendTextToDestination(text),
        isEligibleFn: (destination, text) => destination.isEligibleForPasteContent(text),
      },
      contentNameCode: MessageCode.CONTENT_NAME_SELECTED_TEXT,
      fnName: 'pasteSelectedTextToDestination',
      selfPastePolicy: 'block-on-editor-selection',
    });
  }
}
