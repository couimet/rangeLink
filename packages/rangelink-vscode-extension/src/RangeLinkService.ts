import type { Logger } from 'barebone-logger';
import { type DelimiterConfigGetter, type FormattedLink, LinkType } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { ConfigReader } from './config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_CONTENT,
  DEFAULT_SMART_PADDING_PASTE_LINK,
  SETTING_SMART_PADDING_PASTE_CONTENT,
  SETTING_SMART_PADDING_PASTE_LINK,
  SETTING_WARN_ON_DIRTY_BUFFER,
} from './constants';
import type { PasteDestinationManager } from './destinations/PasteDestinationManager';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import {
  ClipboardRouter,
  FilePathPaster,
  getReferencePath,
  handleDirtyBufferWarning,
  SelectionValidator,
  TerminalSelectionService,
} from './services';
import {
  DestinationBehavior,
  DirtyBufferWarningResult,
  MessageCode,
  PasteContentType,
  PathFormat,
  type TerminalPasteResult,
} from './types';
import { formatMessage, generateLinkFromSelections } from './utils';

export { DestinationBehavior, PathFormat } from './types';

const NOOP_SEND_FN = () => Promise.resolve(false);
const NOOP_ELIGIBILITY_FN = () => Promise.resolve(false);

/**
 * RangeLinkService: VSCode-specific orchestration layer
 * Core logic is handled by rangelink-core-ts functions
 */
export class RangeLinkService {
  constructor(
    private readonly getDelimiters: DelimiterConfigGetter,
    private readonly ideAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
    private readonly configReader: ConfigReader,
    private readonly clipboardRouter: ClipboardRouter,
    private readonly terminalSelectionService: TerminalSelectionService,
    private readonly filePathPaster: FilePathPaster,
    private readonly logger: Logger,
    private readonly selectionValidator: SelectionValidator,
  ) {}

  /**
   * Creates a standard RangeLink from the current editor selection
   */
  async createLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    await this.createLinkCore(
      pathFormat,
      LinkType.Regular,
      formatMessage(MessageCode.CONTENT_NAME_RANGELINK),
    );
  }

  /**
   * Creates a standard RangeLink and copies to clipboard only (Issue #117)
   *
   * Unlike createLink(), this command ALWAYS skips pasting to bound destinations,
   * even if one is bound. User explicitly requested clipboard-only behavior.
   *
   * @param pathFormat Whether to use relative or absolute paths
   */
  async createLinkOnly(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const formattedLink = await this.generateLinkFromSelection(pathFormat, LinkType.Regular);
    if (formattedLink) {
      await this.clipboardRouter.copyAndSendToDestination({
        control: {
          contentType: PasteContentType.Link,
          destinationBehavior: DestinationBehavior.ClipboardOnly,
        },
        content: {
          clipboard: formattedLink.link,
          send: formattedLink,
        },
        strategies: {
          sendFn: NOOP_SEND_FN,
          isEligibleFn: NOOP_ELIGIBILITY_FN,
        },
        contentName: formatMessage(MessageCode.CONTENT_NAME_RANGELINK),
        fnName: 'createLinkOnly',
      });
    }
  }

  /**
   * Creates a portable RangeLink with embedded delimiter metadata
   */
  async createPortableLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    await this.createLinkCore(
      pathFormat,
      LinkType.Portable,
      formatMessage(MessageCode.CONTENT_NAME_PORTABLE_RANGELINK),
    );
  }

  /**
   * Paste selected text to bound destination (issue #89)
   *
   * Extracts the currently selected text from the active editor and sends it
   * directly to the bound destination (terminal, text editor, or AI assistant).
   *
   * **Behavior:**
   * - Supports single and multi-selection (concatenates with newlines)
   * - Copies to clipboard as fallback if no destination bound
   * - Shows appropriate success/failure messages
   * - Skips empty selections
   */
  async pasteSelectedTextToDestination(): Promise<void> {
    const logCtx = { fn: 'RangeLinkService.pasteSelectedTextToDestination' };

    const validated = this.selectionValidator.validateSelectionsAndShowError();
    if (!validated) {
      return;
    }

    const { editor, selections } = validated;

    // Extract selected text (concatenate with newlines for multi-selection)
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

  private async createLinkCore(
    pathFormat: PathFormat,
    linkType: LinkType,
    contentName: string,
  ): Promise<void> {
    const logCtx = { fn: 'RangeLinkService.createLinkCore', linkType };
    const formattedLink = await this.generateLinkFromSelection(pathFormat, linkType);
    if (formattedLink) {
      const sourceUri = this.ideAdapter.getActiveTextEditorUri();
      if (!sourceUri) {
        this.logger.debug(logCtx, 'Active editor URI unavailable, aborting');
        return;
      }
      const destinationBehavior = await this.clipboardRouter.resolveDestinationBehavior(logCtx);
      if (destinationBehavior === undefined) return;
      await this.copyToClipboardAndDestination(
        formattedLink,
        contentName,
        sourceUri,
        destinationBehavior,
      );
    } else {
      this.logger.debug(logCtx, 'generateLinkFromSelection returned undefined, aborting');
    }
  }

  /**
   * Generates a link from the current editor selection
   * @param pathFormat Whether to use relative or absolute paths
   * @param linkType Whether to generate a regular or portable link
   * @returns The generated FormattedLink with metadata, or undefined if generation failed
   */
  private async generateLinkFromSelection(
    pathFormat: PathFormat,
    linkType: LinkType,
  ): Promise<FormattedLink | undefined> {
    const validated = this.selectionValidator.validateSelectionsAndShowError();
    if (!validated) {
      return undefined;
    }

    const { editor, selections } = validated;
    const document = editor.document;

    if (document.isDirty) {
      const shouldWarnOnDirty = this.configReader.getBoolean(SETTING_WARN_ON_DIRTY_BUFFER, true);
      if (shouldWarnOnDirty) {
        const warningResult = await handleDirtyBufferWarning(
          document,
          this.ideAdapter,
          this.logger,
        );
        if (
          warningResult === DirtyBufferWarningResult.Dismissed ||
          warningResult === DirtyBufferWarningResult.SaveFailed
        ) {
          return undefined;
        }
      } else {
        this.logger.debug(
          { fn: 'generateLinkFromSelection', documentUri: document.uri.toString() },
          'Document has unsaved changes but warning is disabled by setting',
        );
      }
    }

    const referencePath = getReferencePath(this.ideAdapter, document.uri, pathFormat);

    const result = generateLinkFromSelections({
      referencePath,
      document,
      selections,
      delimiters: this.getDelimiters(),
      linkType,
      logger: this.logger,
    });

    if (!result.success) {
      const linkTypeName = linkType === LinkType.Portable ? 'portable link' : 'link';
      this.logger.error(
        { fn: 'generateLinkFromSelection', error: result.error, linkType },
        `Failed to generate ${linkTypeName}`,
      );
      this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_LINK_GENERATION_FAILED, { linkTypeName }),
      );
      return undefined;
    }

    const formattedLink = result.value;
    this.logger.info(
      { fn: 'generateLinkFromSelection', formattedLink },
      `Generated link: ${formattedLink.link}`,
    );

    return formattedLink;
  }

  /**
   * Copies the link to clipboard and sends to bound destination if available
   *
   * **Auto-paste behavior (text editor destination):**
   * - Skips auto-paste if creating link FROM the bound editor itself
   * - Automatically brings hidden editor to foreground if needed
   *
   * @param formattedLink The formatted RangeLink with metadata
   * @param linkTypeName User-friendly name for status messages (e.g., "RangeLink", "Portable RangeLink")
   * @param sourceUri URI of the source document (for self-paste detection)
   * @param destinationBehavior Whether to send to bound destination or clipboard only
   */
  private async copyToClipboardAndDestination(
    formattedLink: FormattedLink,
    linkTypeName: string,
    sourceUri: vscode.Uri,
    destinationBehavior: DestinationBehavior,
  ): Promise<void> {
    const logCtx = { fn: 'RangeLinkService.copyToClipboardAndDestination' };
    const paddingMode = this.configReader.getPaddingMode(
      SETTING_SMART_PADDING_PASTE_LINK,
      DEFAULT_SMART_PADDING_PASTE_LINK,
    );

    this.logger.debug(
      { ...logCtx, link: formattedLink.link, rawLink: formattedLink.rawLink },
      'Sending link to destination',
    );

    await this.clipboardRouter.copyAndSendToDestination({
      control: {
        contentType: PasteContentType.Link,
        destinationBehavior,
      },
      content: {
        clipboard: formattedLink.link,
        send: formattedLink,
        sourceUri,
      },
      strategies: {
        sendFn: (link, basicStatusMessage) =>
          this.destinationManager.sendLinkToDestination(link, basicStatusMessage, paddingMode),
        isEligibleFn: (destination, link) => destination.isEligibleForPasteLink(link),
      },
      contentName: linkTypeName,
      fnName: 'copyToClipboardAndDestination',
    });
  }
}
