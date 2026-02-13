import type { Logger } from 'barebone-logger';
import {
  type DelimiterConfigGetter,
  type FormattedLink,
  LinkType,
  quotePath,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { ConfigReader } from './config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_CONTENT,
  DEFAULT_SMART_PADDING_PASTE_FILE_PATH,
  DEFAULT_SMART_PADDING_PASTE_LINK,
  SETTING_SMART_PADDING_PASTE_CONTENT,
  SETTING_SMART_PADDING_PASTE_FILE_PATH,
  SETTING_SMART_PADDING_PASTE_LINK,
  SETTING_WARN_ON_DIRTY_BUFFER,
} from './constants';
import type { DestinationPicker } from './destinations/DestinationPicker';
import type { PasteDestination } from './destinations/PasteDestination';
import type { PasteDestinationManager } from './destinations/PasteDestinationManager';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from './errors';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import {
  ActiveSelections,
  DirtyBufferWarningResult,
  MessageCode,
  PasteContentType,
  type QuickPickBindResult,
} from './types';
import { formatMessage, generateLinkFromSelections, isSelfPaste } from './utils';

export enum PathFormat {
  WorkspaceRelative = 'workspace-relative',
  Absolute = 'absolute',
}

/**
 * Controls whether content should be sent to bound destination
 */
export enum DestinationBehavior {
  /**
   * Normal behavior: Send to bound destination if one exists and is eligible
   */
  BoundDestination = 'bound-destination',

  /**
   * Force clipboard-only: Skip destination even if one is bound
   * Used by explicit clipboard-only commands (Issue #117)
   */
  ClipboardOnly = 'clipboard-only',
}

/**
 * No-op send function for clipboard-only operations.
 * Never invoked because ClipboardOnly behavior exits before reaching send logic.
 */
const NOOP_SEND_FN = () => Promise.resolve(false);

/**
 * No-op eligibility function for clipboard-only operations.
 * Never invoked because ClipboardOnly behavior exits before eligibility checks.
 */
const NOOP_ELIGIBILITY_FN = () => Promise.resolve(false);

/**
 * Options for copyAndSendToDestination, grouped by concern.
 */
interface CopyAndSendOptions<T> {
  control: {
    contentType: PasteContentType;
    destinationBehavior: DestinationBehavior;
  };
  content: {
    clipboard: string;
    send: T;
    sourceUri?: vscode.Uri;
  };
  strategies: {
    sendFn: (content: T, basicStatusMessage: string) => Promise<boolean>;
    isEligibleFn: (destination: PasteDestination, content: T) => Promise<boolean>;
  };
  /** User-facing name for status bar messages (e.g., "RangeLink", "Selected text") */
  contentName: string;
  /** Function name for internal logging context */
  fnName: string;
}

/**
 * RangeLinkService: VSCode-specific orchestration layer
 * Core logic is handled by rangelink-core-ts functions
 */
export class RangeLinkService {
  constructor(
    private readonly getDelimiters: DelimiterConfigGetter,
    private readonly ideAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
    private readonly destinationPickerCommand: DestinationPicker,
    private readonly configReader: ConfigReader,
    private readonly logger: Logger,
  ) {}

  /**
   * Creates a standard RangeLink from the current editor selection
   */
  async createLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const formattedLink = await this.generateLinkFromSelection(pathFormat, false);
    if (formattedLink) {
      const sourceUri = this.ideAdapter.getActiveTextEditorUri()!;
      await this.copyToClipboardAndDestination(
        formattedLink,
        formatMessage(MessageCode.CONTENT_NAME_RANGELINK),
        sourceUri,
      );
    }
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
    const formattedLink = await this.generateLinkFromSelection(pathFormat, false);
    if (formattedLink) {
      await this.copyAndSendToDestination({
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
    const formattedLink = await this.generateLinkFromSelection(pathFormat, true);
    if (formattedLink) {
      const sourceUri = this.ideAdapter.getActiveTextEditorUri()!;
      await this.copyToClipboardAndDestination(
        formattedLink,
        formatMessage(MessageCode.CONTENT_NAME_PORTABLE_RANGELINK),
        sourceUri,
      );
    }
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

    const validated = this.validateSelectionsAndShowError();
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

    if (!this.destinationManager.isBound()) {
      this.logger.debug(logCtx, 'No destination bound, showing quick pick');

      const pickerResult = await this.showPickerAndBindForPaste();
      if (pickerResult.outcome !== 'bound') {
        this.logger.debug(
          { ...logCtx, outcome: pickerResult.outcome },
          'Picker did not bind, aborting',
        );
        return;
      }
    }

    await this.copyAndSendToDestination({
      control: {
        contentType: PasteContentType.Text,
        destinationBehavior: DestinationBehavior.BoundDestination,
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

  /**
   * Pastes the file path to the bound destination (context menu)
   *
   * Used by context menu commands where URI is provided from right-click context.
   * Falls back to absolute path if pathFormat is WorkspaceRelative and file is outside workspace.
   *
   * @param uri - URI from context menu (mandatory)
   * @param pathFormat - Whether to use absolute or workspace-relative path
   */
  async pasteFilePathToDestination(uri: vscode.Uri, pathFormat: PathFormat): Promise<void> {
    await this.pasteFilePath(uri, pathFormat, 'context-menu');
  }

  /**
   * Pastes the file path of the current active editor to the bound destination
   *
   * Used by command palette commands. Resolves URI from active text editor.
   * Falls back to absolute path if pathFormat is WorkspaceRelative and file is outside workspace.
   * Shows error if no active editor.
   *
   * @param pathFormat - Whether to use absolute or workspace-relative path
   */
  async pasteCurrentFilePathToDestination(pathFormat: PathFormat): Promise<void> {
    await this.pasteCurrentFilePath(pathFormat);
  }

  /**
   * Core implementation for command palette file path pasting
   *
   * Resolves URI from active text editor and delegates to pasteFilePath.
   * Shows error if no active editor.
   *
   * @param pathFormat - Whether to use relative or absolute paths
   */
  private async pasteCurrentFilePath(pathFormat: PathFormat): Promise<void> {
    const uri = this.ideAdapter.getActiveTextEditorUri();
    if (!uri) {
      this.logger.debug(
        { fn: 'RangeLinkService.pasteCurrentFilePath', pathFormat },
        'No active editor',
      );
      await this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_PASTE_FILE_PATH_NO_ACTIVE_FILE),
      );
      return;
    }
    await this.pasteFilePath(uri, pathFormat, 'command-palette');
  }

  /**
   * Core implementation for pasting file paths to bound destination
   *
   * Follows the R-V (Paste Selected Text) pattern:
   * 1. Format the path based on pathFormat preference
   * 2. Show quick pick if no destination bound
   * 3. Copy to clipboard and send to destination
   *
   * @param uri - File URI (mandatory - caller responsible for resolution)
   * @param pathFormat - Whether to use relative or absolute paths
   * @param uriSource - Source of the URI for logging ('context-menu' or 'command-palette')
   */
  private async pasteFilePath(
    uri: vscode.Uri,
    pathFormat: PathFormat,
    uriSource: 'context-menu' | 'command-palette',
  ): Promise<void> {
    const logCtx = { fn: 'RangeLinkService.pasteFilePath', pathFormat, uriSource };

    const filePath = this.getReferencePath(uri, pathFormat);
    this.logger.debug({ ...logCtx, filePath }, `Resolved file path: ${filePath}`);

    const paddingMode = this.configReader.getPaddingMode(
      SETTING_SMART_PADDING_PASTE_FILE_PATH,
      DEFAULT_SMART_PADDING_PASTE_FILE_PATH,
    );

    if (!this.destinationManager.isBound()) {
      this.logger.debug(logCtx, 'No destination bound, showing quick pick');

      const pickerResult = await this.showPickerAndBindForPaste();
      if (pickerResult.outcome !== 'bound') {
        this.logger.debug(
          { ...logCtx, outcome: pickerResult.outcome },
          'Picker did not bind, aborting',
        );
        return;
      }
    }

    const destinationFilePath = quotePath(filePath);

    if (destinationFilePath !== filePath) {
      this.logger.debug(
        { ...logCtx, before: filePath, after: destinationFilePath },
        'Quoted path for unsafe characters',
      );
    }

    await this.copyAndSendToDestination({
      control: {
        contentType: PasteContentType.Text,
        destinationBehavior: DestinationBehavior.BoundDestination,
      },
      content: {
        clipboard: filePath,
        send: destinationFilePath,
        sourceUri: uri,
      },
      strategies: {
        sendFn: (text, basicStatusMessage) =>
          this.destinationManager.sendTextToDestination(text, basicStatusMessage, paddingMode),
        isEligibleFn: (destination, text) => destination.isEligibleForPasteContent(text),
      },
      contentName: formatMessage(MessageCode.CONTENT_NAME_FILE_PATH),
      fnName: 'pasteFilePath',
    });
  }

  /**
   * Generates a link from the current editor selection
   * @param pathFormat Whether to use relative or absolute paths
   * @param isPortable Whether to generate a portable link with embedded delimiters
   * @returns The generated FormattedLink with metadata, or undefined if generation failed
   */
  private async generateLinkFromSelection(
    pathFormat: PathFormat,
    isPortable: boolean,
  ): Promise<FormattedLink | undefined> {
    const validated = this.validateSelectionsAndShowError();
    if (!validated) {
      return undefined;
    }

    const { editor, selections } = validated;
    const document = editor.document;

    if (document.isDirty) {
      const shouldWarnOnDirty = this.configReader.getBoolean(SETTING_WARN_ON_DIRTY_BUFFER, true);
      if (shouldWarnOnDirty) {
        const warningResult = await this.handleDirtyBufferWarning(document);
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

    const referencePath = this.getReferencePath(document.uri, pathFormat);
    const linkType = isPortable ? LinkType.Portable : LinkType.Regular;

    const result = generateLinkFromSelections({
      referencePath,
      document,
      selections,
      delimiters: this.getDelimiters(),
      linkType,
      logger: this.logger,
    });

    if (!result.success) {
      const linkTypeName = isPortable ? 'portable link' : 'link';
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
   * Handles the dirty buffer warning dialog.
   *
   * @param document The document with unsaved changes
   * @returns The user's choice from the warning dialog
   */
  private async handleDirtyBufferWarning(
    document: vscode.TextDocument,
  ): Promise<DirtyBufferWarningResult> {
    const warningMessage = formatMessage(MessageCode.WARN_LINK_DIRTY_BUFFER);
    const saveAndGenerateLabel = formatMessage(MessageCode.WARN_LINK_DIRTY_BUFFER_SAVE);
    const generateAnywayLabel = formatMessage(MessageCode.WARN_LINK_DIRTY_BUFFER_CONTINUE);

    this.logger.debug(
      { fn: 'handleDirtyBufferWarning', documentUri: document.uri.toString() },
      'Document has unsaved changes, showing warning',
    );

    const choice = await this.ideAdapter.showWarningMessage(
      warningMessage,
      saveAndGenerateLabel,
      generateAnywayLabel,
    );

    const result: DirtyBufferWarningResult =
      choice === saveAndGenerateLabel
        ? DirtyBufferWarningResult.SaveAndGenerate
        : choice === generateAnywayLabel
          ? DirtyBufferWarningResult.GenerateAnyway
          : DirtyBufferWarningResult.Dismissed;

    switch (result) {
      case DirtyBufferWarningResult.SaveAndGenerate: {
        this.logger.debug({ fn: 'handleDirtyBufferWarning' }, 'User chose to save and generate');
        const saved = await document.save();
        if (!saved) {
          this.logger.warn(
            { fn: 'handleDirtyBufferWarning' },
            'Save operation failed or was cancelled',
          );
          this.ideAdapter.showWarningMessage(
            formatMessage(MessageCode.WARN_LINK_DIRTY_BUFFER_SAVE_FAILED),
          );
          return DirtyBufferWarningResult.SaveFailed;
        }
        this.logger.debug({ fn: 'handleDirtyBufferWarning' }, 'Document saved successfully');
        return result;
      }
      case DirtyBufferWarningResult.GenerateAnyway:
        this.logger.debug({ fn: 'handleDirtyBufferWarning' }, 'User chose to generate anyway');
        return result;
      case DirtyBufferWarningResult.Dismissed:
        this.logger.debug({ fn: 'handleDirtyBufferWarning' }, 'User dismissed warning, aborting');
        return result;
      default: {
        const exhaustiveCheck: never = result;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: `Unexpected dirty buffer warning result: ${exhaustiveCheck}`,
          functionName: 'handleDirtyBufferWarning',
          details: { exhaustiveCheck },
        });
      }
    }
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
   */
  private async copyToClipboardAndDestination(
    formattedLink: FormattedLink,
    linkTypeName: string,
    sourceUri: vscode.Uri,
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

    await this.copyAndSendToDestination({
      control: {
        contentType: PasteContentType.Link,
        destinationBehavior: DestinationBehavior.BoundDestination,
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

  /**
   * Validates that active editor exists with non-empty selections and shows appropriate error if not.
   *
   * Consolidates duplicate validation logic from generateLinkFromSelection and other methods.
   * Shows context-appropriate error message based on failure reason:
   * - No active editor: ERROR_NO_ACTIVE_EDITOR
   * - Empty selections: ERROR_NO_TEXT_SELECTED
   *
   * @returns Object with editor and selections if valid, undefined if validation failed
   */
  private validateSelectionsAndShowError():
    | { editor: vscode.TextEditor; selections: readonly vscode.Selection[] }
    | undefined {
    const logCtx = { fn: 'RangeLinkService.validateSelectionsAndShowError' };
    const activeSelections = ActiveSelections.create(this.ideAdapter.activeTextEditor);

    this.logger.debug(
      {
        ...logCtx,
        hasEditor: !!activeSelections.editor,
        selectionCount: activeSelections.selections.length,
        selections: this.mapSelectionsForLogging(activeSelections.selections),
        documentVersion: activeSelections.editor?.document.version,
        documentLineCount: activeSelections.editor?.document.lineCount,
        documentIsDirty: activeSelections.editor?.document.isDirty,
        documentIsClosed: activeSelections.editor?.document.isClosed,
      },
      'Selection validation starting',
    );

    const nonEmptySelections = activeSelections.getNonEmptySelections();

    if (!nonEmptySelections) {
      const errorCode = activeSelections.editor
        ? MessageCode.ERROR_NO_TEXT_SELECTED
        : MessageCode.ERROR_NO_ACTIVE_EDITOR;
      const errorMsg = formatMessage(errorCode);

      const editor = activeSelections.editor;
      const lineContentAtBoundaries = editor
        ? this.getLineContentAtSelectionBoundaries(editor.document, activeSelections.selections)
        : undefined;

      this.logger.warn(
        {
          ...logCtx,
          hasEditor: !!editor,
          errorCode,
          selectionCount: activeSelections.selections.length,
          selections: this.mapSelectionsForLogging(activeSelections.selections),
          documentVersion: editor?.document.version,
          documentLineCount: editor?.document.lineCount,
          documentIsDirty: editor?.document.isDirty,
          documentIsClosed: editor?.document.isClosed,
          lineContentAtBoundaries,
        },
        'Selection validation failed - full diagnostic context',
      );

      this.ideAdapter.showErrorMessage(errorMsg);
      return undefined;
    }

    // Safe: getNonEmptySelections() returning non-null guarantees editor exists
    return { editor: activeSelections.editor!, selections: nonEmptySelections };
  }

  /**
   * Maps selections to a logging-friendly format with defensive property access
   */
  private mapSelectionsForLogging(selections: readonly vscode.Selection[]): Array<{
    index: number;
    start: { line: number | undefined; char: number | undefined };
    end: { line: number | undefined; char: number | undefined };
    isEmpty: boolean | undefined;
  }> {
    return selections.map((s, i) => ({
      index: i,
      start: { line: s.start?.line, char: s.start?.character },
      end: { line: s.end?.line, char: s.end?.character },
      isEmpty: s.isEmpty,
    }));
  }

  /**
   * Extracts line content at selection boundaries for diagnostic logging
   *
   * Safely retrieves the text content at each selection's start and end lines.
   * Returns undefined for lines that are out of bounds (indicating stale selection state).
   */
  private getLineContentAtSelectionBoundaries(
    document: vscode.TextDocument,
    selections: readonly vscode.Selection[],
  ): Array<{
    index: number;
    startLineContent: string | undefined;
    endLineContent: string | undefined;
  }> {
    return selections.map((sel, index) => {
      let startLineContent: string | undefined;
      let endLineContent: string | undefined;

      const startLine = sel.start?.line;
      const endLine = sel.end?.line;

      try {
        if (startLine !== undefined && startLine >= 0 && startLine < document.lineCount) {
          startLineContent = document.lineAt(startLine).text;
        }
      } catch {
        startLineContent = undefined;
      }

      try {
        if (endLine !== undefined && endLine >= 0 && endLine < document.lineCount) {
          endLineContent = document.lineAt(endLine).text;
        }
      } catch {
        endLineContent = undefined;
      }

      return { index, startLineContent, endLineContent };
    });
  }

  /**
   * Gets the reference path based on the path format preference
   *
   * Returns workspace-relative path only when both conditions are met:
   * - pathFormat is WorkspaceRelative
   * - file is inside a workspace folder (required to compute relative path)
   */
  private getReferencePath(uri: vscode.Uri, pathFormat: PathFormat): string {
    const workspaceFolder = this.ideAdapter.getWorkspaceFolder(uri);
    if (workspaceFolder && pathFormat === PathFormat.WorkspaceRelative) {
      return this.ideAdapter.asRelativePath(uri);
    }
    return uri.fsPath;
  }

  /**
   * Unified utility for copying content to clipboard and sending to bound destination
   *
   * Eliminates duplication between copyToClipboardAndDestination and other methods.
   * Handles clipboard copy, destination binding check, skip-auto-paste logic, sending, and status messages.
   *
   * **Message handling:**
   * - Automatic destinations (Terminal, Text Editor): Shows status bar "✓ ${contentName} copied to clipboard and sent to ${displayName}"
   * - Clipboard destinations (Claude Code, Cursor AI): Shows status bar "✓ ${contentName} copied to clipboard" + information popup with getUserInstruction()
   * - No destination bound: Shows "✓ ${contentName} copied to clipboard"
   */
  private async copyAndSendToDestination<T>(options: CopyAndSendOptions<T>): Promise<void> {
    const { control, content, strategies, contentName, fnName } = options;

    // Copy to clipboard
    await this.ideAdapter.writeTextToClipboard(content.clipboard);

    const basicStatusMessage = formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, {
      linkTypeName: contentName,
    });

    // Early return if skipping destination (either forced or not bound)
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

    // Safe: isBound() guarantees getBoundDestination() returns non-undefined
    const destination = this.destinationManager.getBoundDestination()!;
    const displayName = destination.displayName || 'destination';

    // Check eligibility before sending
    const isEligible = await strategies.isEligibleFn(destination, content.send);
    if (!isEligible) {
      this.logger.debug(
        { fn: fnName, boundDestination: displayName },
        'Content not eligible for paste - skipping auto-paste',
      );
      this.ideAdapter.setStatusBarMessage(basicStatusMessage);
      return;
    }

    // Check for self-paste (source and destination are the same file)
    if (content.sourceUri && isSelfPaste(content.sourceUri, destination)) {
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

    // Send to bound destination (manager handles all feedback)
    await strategies.sendFn(content.send, basicStatusMessage);
  }

  /**
   * Orchestrates: picker command → user selection → manager.bind()
   *
   * @returns QuickPickBindResult with outcome and error details if binding failed
   */
  private async showPickerAndBindForPaste(): Promise<QuickPickBindResult> {
    const logCtx = { fn: 'RangeLinkService.showPickerAndBindForPaste' };

    const result = await this.destinationPickerCommand.pick({
      noDestinationsMessageCode: MessageCode.INFO_PASTE_CONTENT_NO_DESTINATIONS_AVAILABLE,
      placeholderMessageCode: MessageCode.INFO_PASTE_CONTENT_QUICK_PICK_DESTINATIONS_CHOOSE_BELOW,
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
        return { outcome: 'bound', bindInfo: bindResult.value };
      }

      default: {
        const _exhaustiveCheck: never = result;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: 'Unexpected picker result outcome',
          functionName: 'RangeLinkService.showPickerAndBindForPaste',
          details: { result: _exhaustiveCheck },
        });
      }
    }
  }
}
