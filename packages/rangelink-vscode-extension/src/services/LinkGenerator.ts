import type { Logger } from '@couimet/logger-contract';
import { type DelimiterConfigGetter, type FormattedLink, LinkType } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { ConfigReader } from '../config/ConfigReader';
import { DEFAULT_SMART_PADDING_PASTE_LINK, SETTING_SMART_PADDING_PASTE_LINK } from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { OperationFeedbackProvider } from '../feedback';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { DirtyBufferWarningResult, MessageCode, PasteContentType, PathFormat } from '../types';
import { applySmartPadding, formatMessage, generateLinkFromSelections } from '../utils';

import { getReferencePath } from './FilePathPaster';
import { handleDirtyBufferWarning } from './handleDirtyBufferWarning';
import type { SelectionValidator } from './SelectionValidator';
import type { SendRouter } from './SendRouter';
import { LINK_DIRTY_BUFFER_CODES } from './types';

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
    private readonly sendRouter: SendRouter,
    private readonly selectionValidator: SelectionValidator,
    private readonly feedbackProvider: OperationFeedbackProvider,
    private readonly logger: Logger,
  ) {}

  async createLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    await this.createLinkCore(pathFormat, LinkType.Regular, MessageCode.CONTENT_NAME_RANGELINK);
  }

  async createLinkOnly(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const formattedLink = await this.generateLinkFromSelection(pathFormat, LinkType.Regular);
    if (formattedLink) {
      await this.ideAdapter.writeTextToClipboard(formattedLink.link);
      this.feedbackProvider.provideCopyFeedback(MessageCode.CONTENT_NAME_RANGELINK);
    } else {
      this.logger.debug(
        { fn: 'LinkGenerator.createLinkOnly' },
        'generateLinkFromSelection returned undefined, aborting',
      );
    }
  }

  async createPortableLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    await this.createLinkCore(
      pathFormat,
      LinkType.Portable,
      MessageCode.CONTENT_NAME_PORTABLE_RANGELINK,
    );
  }

  private async createLinkCore(
    pathFormat: PathFormat,
    linkType: LinkType,
    contentNameCode: MessageCode,
  ): Promise<void> {
    const logCtx = { fn: 'LinkGenerator.createLinkCore', linkType };
    const formattedLink = await this.generateLinkFromSelection(pathFormat, linkType);
    if (formattedLink) {
      const sourceUri = this.ideAdapter.getActiveTextEditorUri();
      if (!sourceUri) {
        this.logger.debug(logCtx, 'Active editor URI unavailable, aborting');
        return;
      }
      const resolved = await this.sendRouter.resolveDestination(logCtx);
      if (!resolved) return;
      await this.copyToClipboardAndDestination(formattedLink, contentNameCode, sourceUri);
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

    let { editor, selections } = validated;
    let document = editor.document;

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

    if (warningResult === DirtyBufferWarningResult.SaveAndContinue) {
      const preSaveSelections = selections;
      const revalidated = this.selectionValidator.validateSelectionsAndShowError();
      if (!revalidated) {
        this.logger.debug(
          { fn: 'generateLinkFromSelection' },
          'Post-save re-validation returned no selections, aborting',
        );
        return undefined;
      }
      ({ editor, selections } = revalidated);
      document = editor.document;
      this.logger.debug(
        {
          fn: 'generateLinkFromSelection',
          preSaveSelections: this.selectionValidator.mapSelectionsForLogging(preSaveSelections),
          postSaveSelections: this.selectionValidator.mapSelectionsForLogging(selections),
        },
        'Re-read selections after Save & Continue to account for possible format-on-save shifts',
      );
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
      const linkTypeName = formatMessage(
        linkType === LinkType.Portable
          ? MessageCode.ERROR_LINK_TYPE_NAME_PORTABLE
          : MessageCode.ERROR_LINK_TYPE_NAME_REGULAR,
      );
      this.logger.error(
        { fn: 'generateLinkFromSelection', error: result.error, linkType },
        `Failed to generate ${linkTypeName}`,
      );
      this.feedbackProvider.showError(
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
    contentNameCode: MessageCode,
    sourceUri: vscode.Uri,
  ): Promise<void> {
    const logCtx = { fn: 'LinkGenerator.copyToClipboardAndDestination' };
    const paddingMode = this.configReader.getPaddingMode(
      SETTING_SMART_PADDING_PASTE_LINK,
      DEFAULT_SMART_PADDING_PASTE_LINK,
    );

    const paddedLink = applySmartPadding(formattedLink.link, paddingMode);

    this.logger.debug(
      { ...logCtx, link: formattedLink.link, rawLink: formattedLink.rawLink },
      'Sending link to destination',
    );

    await this.sendRouter.sendToDestination({
      control: {
        contentType: PasteContentType.Link,
      },
      content: {
        clipboard: formattedLink.link,
        send: { ...formattedLink, link: paddedLink },
        sourceUri,
        sourceViewColumn: this.ideAdapter.getActiveEditorViewColumn(),
      },
      strategies: {
        sendFn: (link) => this.destinationManager.sendLinkToDestination(link),
        isEligibleFn: (destination, link) => destination.isEligibleForPasteLink(link),
      },
      contentNameCode,
      fnName: 'copyToClipboardAndDestination',
      selfPastePolicy: 'block-on-uri',
      writeClipboardOnSelfPasteBlock: true,
    });
  }
}
