import type { ConfigReader } from '../config/ConfigReader';
import { DEFAULT_SMART_PADDING_PASTE_LINK, SETTING_SMART_PADDING_PASTE_LINK } from '../constants';
import type { PasteDestination } from '../destinations/PasteDestination';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { RangeLinkExtensionErrorCodes } from '../errors';
import type { OperationFeedbackProvider } from '../feedback';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { type BindContext, DirtyBufferWarningResult, type ExtensionErrorCode, MessageCode, PasteContentType, PathFormat } from '../types';
import { applySmartPadding, formatMessage, generateLinkFromSelections, generateTextFragmentLink } from '../utils';

import { getReferencePath } from './FilePathPaster';
import { handleDirtyBufferWarning } from './handleDirtyBufferWarning';
import type { SelectionValidator } from './SelectionValidator';
import type { SendRouter } from './SendRouter';
import { toBindContext } from './toBindContext';
import { LINK_DIRTY_BUFFER_CODES } from './types';

import type { Logger } from '@couimet/logger-contract';
import { type DelimiterConfigGetter, type FormattedLink, LinkType } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

/**
 * Inputs every link generator needs once validation, dirty-buffer handling, and
 * reference-path resolution have run. `document` and `selections` reflect the
 * post-save re-read when the user chose "Save & Continue".
 */
interface GenerationContext {
  document: vscode.TextDocument;
  selections: readonly vscode.Selection[];
  referencePath: string;
}

/** Generation step shared by every link kind: produce content, or undefined when aborted. */
interface ContentGeneration<T> {
  /** MessageCode naming the content, used in the shared core's logging context. */
  contentNameCode: MessageCode;
  /** Generator function name, used in the abort log message. */
  generatorName: string;
  generate: () => Promise<T | undefined>;
  deliver: (content: T, sourceUri: vscode.Uri, bindContext: BindContext | undefined) => Promise<void>;
}

/**
 * One `sendRouter.sendToDestination` call described declaratively.
 *
 * `T` is the payload shape the destination receives: a FormattedLink for numeric
 * links, a plain string for text fragments. `clipboard` is also the string that
 * gets smart-padded — `toSendPayload` receives the padded form.
 */
interface DestinationDelivery<T> {
  clipboard: string;
  toSendPayload: (paddedLink: string) => T;
  contentType: PasteContentType;
  sendFn: (content: T) => Promise<boolean>;
  isEligibleFn: (destination: PasteDestination, content: T) => Promise<boolean>;
  contentNameCode: MessageCode;
  /** Function name for SendRouter's logging context. */
  fnName: string;
  logMessage: string;
  logFields: Record<string, unknown>;
}

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
    await this.createNumericLink(pathFormat, LinkType.Regular, MessageCode.CONTENT_NAME_RANGELINK);
  }

  async createLinkOnly(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const formattedLink = await this.generateLinkFromSelection(pathFormat, LinkType.Regular);
    if (formattedLink) {
      await this.ideAdapter.writeTextToClipboard(formattedLink.link);
      this.feedbackProvider.provideCopyFeedback(MessageCode.CONTENT_NAME_RANGELINK);
    } else {
      this.logger.debug({ fn: 'LinkGenerator.createLinkOnly' }, 'generateLinkFromSelection returned undefined, aborting');
    }
  }

  async createPortableLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    await this.createNumericLink(pathFormat, LinkType.Portable, MessageCode.CONTENT_NAME_PORTABLE_RANGELINK);
  }

  async createTextFragmentLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    await this.createContentCore<string>({
      contentNameCode: MessageCode.CONTENT_NAME_TEXT_FRAGMENT,
      generatorName: 'generateTextFragmentLinkFromSelection',
      generate: () => this.generateTextFragmentLinkFromSelection(pathFormat),
      deliver: (link, sourceUri, bindContext) => this.deliverTextFragment(link, sourceUri, bindContext),
    });
  }

  async createTextFragmentLinkOnly(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const link = await this.generateTextFragmentLinkFromSelection(pathFormat);
    if (link) {
      await this.ideAdapter.writeTextToClipboard(link);
      this.feedbackProvider.provideCopyFeedback(MessageCode.CONTENT_NAME_TEXT_FRAGMENT);
    } else {
      this.logger.debug({ fn: 'LinkGenerator.createTextFragmentLinkOnly' }, 'generateTextFragmentLinkFromSelection returned undefined, aborting');
    }
  }

  private async createNumericLink(pathFormat: PathFormat, linkType: LinkType, contentNameCode: MessageCode): Promise<void> {
    await this.createContentCore<FormattedLink>({
      contentNameCode,
      generatorName: 'generateLinkFromSelection',
      generate: () => this.generateLinkFromSelection(pathFormat, linkType),
      deliver: (link, sourceUri, bindContext) => this.deliverFormattedLink(link, contentNameCode, sourceUri, bindContext),
    });
  }

  /**
   * Generate content, then hand it to the bound destination.
   *
   * Both link kinds share this pipeline: the only differences are what
   * `generate` produces and how `deliver` ships it.
   */
  private async createContentCore<T>(options: ContentGeneration<T>): Promise<void> {
    const logCtx = { fn: 'LinkGenerator.createContentCore', contentNameCode: options.contentNameCode };

    const content = await options.generate();
    if (!content) {
      this.logger.debug(logCtx, `${options.generatorName} returned undefined, aborting`);
      return;
    }

    const sourceUri = this.ideAdapter.getActiveTextEditorUri();
    if (!sourceUri) {
      this.logger.debug(logCtx, 'Active editor URI unavailable, aborting');
      return;
    }

    const resolveResult = await this.sendRouter.resolveDestination(logCtx);
    if (!resolveResult.canProceed) return;

    await options.deliver(content, sourceUri, toBindContext(resolveResult));
  }

  private async generateLinkFromSelection(pathFormat: PathFormat, linkType: LinkType): Promise<FormattedLink | undefined> {
    const fnName = 'generateLinkFromSelection';

    const context = await this.resolveGenerationContext(pathFormat, fnName);
    if (!context) return undefined;

    const result = generateLinkFromSelections({
      referencePath: context.referencePath,
      document: context.document,
      selections: context.selections,
      delimiters: this.getDelimiters(),
      linkType,
      logger: this.logger,
    });

    if (!result.success) {
      const linkTypeName = formatMessage(linkType === LinkType.Portable ? MessageCode.ERROR_LINK_TYPE_NAME_PORTABLE : MessageCode.ERROR_LINK_TYPE_NAME_REGULAR);
      this.logger.error({ fn: fnName, error: result.error, linkType }, `Failed to generate ${linkTypeName}`);
      this.feedbackProvider.showError(formatMessage(MessageCode.ERROR_LINK_GENERATION_FAILED, { linkTypeName }));
      return undefined;
    }

    const formattedLink = result.value;
    this.logger.info({ fn: fnName, formattedLink }, `Generated link: ${formattedLink.link}`);

    return formattedLink;
  }

  private async generateTextFragmentLinkFromSelection(pathFormat: PathFormat): Promise<string | undefined> {
    const fnName = 'generateTextFragmentLinkFromSelection';

    const context = await this.resolveGenerationContext(pathFormat, fnName);
    if (!context) return undefined;

    const result = generateTextFragmentLink({
      referencePath: context.referencePath,
      document: context.document,
      selections: context.selections,
      logger: this.logger,
    });

    if (!result.success) {
      this.logger.error({ fn: fnName, error: result.error }, 'Failed to generate text fragment link');
      this.feedbackProvider.showError(formatMessage(this.mapTextFragmentGenerationErrorToMessage(result.error.code)));
      return undefined;
    }

    return result.value;
  }

  /**
   * Shared preamble for every generator: validate selections, ride out the
   * dirty-buffer dialog, and resolve the reference path against the document
   * that survived any post-save re-read.
   *
   * `fnName` labels the calling generator so its logs stay distinguishable.
   */
  private async resolveGenerationContext(pathFormat: PathFormat, fnName: string): Promise<GenerationContext | undefined> {
    const validated = this.selectionValidator.validateSelectionsAndShowError();
    if (!validated) {
      return undefined;
    }

    let { editor, selections } = validated;
    let document = editor.document;

    const warningResult = await handleDirtyBufferWarning(document, this.configReader, this.ideAdapter, this.logger, LINK_DIRTY_BUFFER_CODES);
    if (warningResult === DirtyBufferWarningResult.Dismissed || warningResult === DirtyBufferWarningResult.SaveFailed) {
      return undefined;
    }

    if (warningResult === DirtyBufferWarningResult.SaveAndContinue) {
      const preSaveSelections = selections;
      const revalidated = this.selectionValidator.validateSelectionsAndShowError();
      if (!revalidated) {
        this.logger.debug({ fn: fnName }, 'Post-save re-validation returned no selections, aborting');
        return undefined;
      }
      ({ editor, selections } = revalidated);
      document = editor.document;
      this.logger.debug(
        {
          fn: fnName,
          preSaveSelections: this.selectionValidator.mapSelectionsForLogging(preSaveSelections),
          postSaveSelections: this.selectionValidator.mapSelectionsForLogging(selections),
        },
        'Re-read selections after Save & Continue to account for possible format-on-save shifts',
      );
    }

    return { document, selections, referencePath: getReferencePath(this.ideAdapter, document.uri, pathFormat) };
  }

  private mapTextFragmentGenerationErrorToMessage(errorCode: ExtensionErrorCode): MessageCode {
    switch (errorCode) {
      case RangeLinkExtensionErrorCodes.GENERATE_TEXT_FRAGMENT_MULTIPLE_SELECTIONS:
        return MessageCode.ERROR_TEXT_FRAGMENT_MULTIPLE_SELECTIONS;
      case RangeLinkExtensionErrorCodes.GENERATE_TEXT_FRAGMENT_TEXT_NOT_UNIQUE:
        return MessageCode.ERROR_TEXT_FRAGMENT_TEXT_NOT_UNIQUE;
      default:
        return MessageCode.ERROR_TEXT_FRAGMENT_GENERATION_FAILED;
    }
  }

  private async deliverFormattedLink(
    formattedLink: FormattedLink,
    contentNameCode: MessageCode,
    sourceUri: vscode.Uri,
    bindContext: BindContext | undefined,
  ): Promise<void> {
    await this.deliverContent<FormattedLink>(
      {
        clipboard: formattedLink.link,
        toSendPayload: (paddedLink) => ({ ...formattedLink, link: paddedLink }),
        contentType: PasteContentType.Link,
        sendFn: (link) => this.destinationManager.sendLinkToDestination(link),
        isEligibleFn: (destination, link) => destination.isEligibleForPasteLink(link),
        contentNameCode,
        fnName: 'deliverFormattedLink',
        logMessage: 'Sending link to destination',
        logFields: { link: formattedLink.link, rawLink: formattedLink.rawLink },
      },
      sourceUri,
      bindContext,
    );
  }

  private async deliverTextFragment(link: string, sourceUri: vscode.Uri, bindContext: BindContext | undefined): Promise<void> {
    await this.deliverContent<string>(
      {
        clipboard: link,
        toSendPayload: (paddedLink) => paddedLink,
        contentType: PasteContentType.Text,
        sendFn: (text) => this.destinationManager.sendTextToDestination(text),
        isEligibleFn: (destination, text) => destination.isEligibleForPasteContent(text),
        contentNameCode: MessageCode.CONTENT_NAME_TEXT_FRAGMENT,
        fnName: 'deliverTextFragment',
        logMessage: 'Sending text fragment link to destination',
        logFields: { link },
      },
      sourceUri,
      bindContext,
    );
  }

  private async deliverContent<T>(options: DestinationDelivery<T>, sourceUri: vscode.Uri, bindContext: BindContext | undefined): Promise<void> {
    const paddingMode = this.configReader.getPaddingMode(SETTING_SMART_PADDING_PASTE_LINK, DEFAULT_SMART_PADDING_PASTE_LINK);
    const paddedLink = applySmartPadding(options.clipboard, paddingMode);

    this.logger.debug({ fn: options.fnName, ...options.logFields }, options.logMessage);

    await this.sendRouter.sendToDestination(
      {
        control: {
          contentType: options.contentType,
        },
        content: {
          clipboard: options.clipboard,
          send: options.toSendPayload(paddedLink),
          sourceUri,
          sourceViewColumn: this.ideAdapter.getActiveEditorViewColumn(),
        },
        strategies: {
          sendFn: options.sendFn,
          isEligibleFn: options.isEligibleFn,
        },
        contentNameCode: options.contentNameCode,
        fnName: options.fnName,
        selfPastePolicy: 'block-on-uri',
        writeClipboardOnSelfPasteBlock: true,
      },
      bindContext,
    );
  }
}
