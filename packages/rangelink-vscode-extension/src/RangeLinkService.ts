import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { ConfigReader } from './config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_CONTENT,
  SETTING_SMART_PADDING_PASTE_CONTENT,
} from './constants';
import type { PasteDestinationManager } from './destinations/PasteDestinationManager';
import {
  ClipboardRouter,
  FilePathPaster,
  LinkGenerator,
  SelectionValidator,
  TerminalSelectionService,
} from './services';
import { MessageCode, PasteContentType, PathFormat, type TerminalPasteResult } from './types';
import { formatMessage } from './utils';

export { DestinationBehavior, PathFormat } from './types';

/**
 * RangeLinkService: VSCode-specific orchestration layer.
 * Delegates to focused single-responsibility services.
 */
export class RangeLinkService {
  constructor(
    private readonly destinationManager: PasteDestinationManager,
    private readonly configReader: ConfigReader,
    private readonly clipboardRouter: ClipboardRouter,
    private readonly terminalSelectionService: TerminalSelectionService,
    private readonly filePathPaster: FilePathPaster,
    private readonly linkGenerator: LinkGenerator,
    private readonly logger: Logger,
    private readonly selectionValidator: SelectionValidator,
  ) {}

  async createLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    return this.linkGenerator.createLink(pathFormat);
  }

  async createLinkOnly(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    return this.linkGenerator.createLinkOnly(pathFormat);
  }

  async createPortableLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    return this.linkGenerator.createPortableLink(pathFormat);
  }

  async pasteSelectedTextToDestination(): Promise<void> {
    const logCtx = { fn: 'RangeLinkService.pasteSelectedTextToDestination' };

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

  async pasteTerminalSelectionToDestination(): Promise<TerminalPasteResult> {
    return this.terminalSelectionService.pasteTerminalSelectionToDestination();
  }

  async terminalLinkBridge(): Promise<void> {
    return this.terminalSelectionService.terminalLinkBridge();
  }

  terminalCopyLinkGuard(): void {
    this.terminalSelectionService.terminalCopyLinkGuard();
  }

  async pasteFilePathToDestination(uri: vscode.Uri, pathFormat: PathFormat): Promise<void> {
    return this.filePathPaster.pasteFilePathToDestination(uri, pathFormat);
  }

  async pasteCurrentFilePathToDestination(pathFormat: PathFormat): Promise<void> {
    return this.filePathPaster.pasteCurrentFilePathToDestination(pathFormat);
  }
}
