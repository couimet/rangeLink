import type { Logger } from 'barebone-logger';
import { type DelimiterConfigGetter, type FormattedLink, LinkType } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { ConfigReader } from '../config/ConfigReader';
import { DEFAULT_SMART_PADDING_PASTE_LINK, SETTING_SMART_PADDING_PASTE_LINK } from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  DestinationBehavior,
  DirtyBufferWarningResult,
  MessageCode,
  PasteContentType,
  PathFormat,
} from '../types';
import { formatMessage, generateLinkFromSelections } from '../utils';

import type { ClipboardRouter } from './ClipboardRouter';
import { getReferencePath } from './FilePathPaster';
import { handleDirtyBufferWarning, LINK_DIRTY_BUFFER_CODES } from './handleDirtyBufferWarning';
import type { SelectionValidator } from './SelectionValidator';

const NOOP_SEND_FN = () => Promise.resolve(false);
const NOOP_ELIGIBILITY_FN = () => Promise.resolve(false);

/**
 * Orchestrates link creation from editor selections.
 * Handles validation, dirty buffer warnings, link generation,
 * clipboard routing, and destination delivery.
 */
export class LinkGenerator {
  constructor(
    private readonly getDelimiters: DelimiterConfigGetter,
    private readonly ideAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
    private readonly configReader: ConfigReader,
    private readonly clipboardRouter: ClipboardRouter,
    private readonly selectionValidator: SelectionValidator,
    private readonly logger: Logger,
  ) {}

  async createLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    await this.createLinkCore(
      pathFormat,
      LinkType.Regular,
      formatMessage(MessageCode.CONTENT_NAME_RANGELINK),
    );
  }

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

  async createPortableLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    await this.createLinkCore(
      pathFormat,
      LinkType.Portable,
      formatMessage(MessageCode.CONTENT_NAME_PORTABLE_RANGELINK),
    );
  }

  private async createLinkCore(
    pathFormat: PathFormat,
    linkType: LinkType,
    contentName: string,
  ): Promise<void> {
    const logCtx = { fn: 'LinkGenerator.createLinkCore', linkType };
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

    const warningResult = await handleDirtyBufferWarning(
      document,
      this.configReader,
      this.ideAdapter,
      this.logger,
      LINK_DIRTY_BUFFER_CODES,
    );
    if (
      warningResult === DirtyBufferWarningResult.Dismissed ||
      warningResult === DirtyBufferWarningResult.SaveFailed
    ) {
      return undefined;
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

  private async copyToClipboardAndDestination(
    formattedLink: FormattedLink,
    linkTypeName: string,
    sourceUri: vscode.Uri,
    destinationBehavior: DestinationBehavior,
  ): Promise<void> {
    const logCtx = { fn: 'LinkGenerator.copyToClipboardAndDestination' };
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
