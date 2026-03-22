import type { Logger } from 'barebone-logger';
import {
  type DelimiterConfigGetter,
  type FormattedLink,
  LinkType,
  quotePath,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { ClipboardPreserver } from './clipboard/ClipboardPreserver';
import type { ConfigReader } from './config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_CONTENT,
  DEFAULT_SMART_PADDING_PASTE_FILE_PATH,
  DEFAULT_SMART_PADDING_PASTE_LINK,
  SETTING_SMART_PADDING_PASTE_CONTENT,
  SETTING_SMART_PADDING_PASTE_FILE_PATH,
  SETTING_SMART_PADDING_PASTE_LINK,
  SETTING_WARN_ON_DIRTY_BUFFER,
  VSCODE_CMD_TERMINAL_COPY_SELECTION,
} from './constants';
import type { PasteDestinationManager } from './destinations/PasteDestinationManager';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { ClipboardRouter, handleDirtyBufferWarning, SelectionValidator } from './services';
import {
  DestinationBehavior,
  DirtyBufferWarningResult,
  MessageCode,
  PasteContentType,
  PathFormat,
  RelativePathFormat,
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
    private readonly clipboardPreserver: ClipboardPreserver,
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

  /**
   * Pastes the terminal selection to the bound destination (R-V from terminal).
   *
   * Uses a clipboard roundtrip to read terminal selection text because VSCode
   * does not expose Terminal.selection as a string (microsoft/vscode#188173).
   *
   * Flow: copy terminal selection to clipboard → read clipboard → send to destination.
   * The clipboard overwrite is consistent with existing RangeLink behavior;
   * clipboard preservation is tracked in #353.
   *
   * @returns TerminalPasteResult with the outcome and optional error for catch-originated failures
   */
  // Clipboard roundtrip can be revisited if microsoft/vscode#188173 ships a Terminal.selection API,
  // but adopting it would raise our minimum VSCode engine version.
  async pasteTerminalSelectionToDestination(): Promise<TerminalPasteResult> {
    const logCtx = { fn: 'RangeLinkService.pasteTerminalSelectionToDestination' };

    const activeTerminal = this.ideAdapter.activeTerminal;
    if (!activeTerminal) {
      this.logger.debug(logCtx, 'No active terminal');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TERMINAL));
      return { outcome: 'no-active-terminal' };
    }

    // Wrap the clipboard roundtrip in preservation so the user's clipboard is restored
    // after reading the terminal text and before copyAndSendToDestination writes its own value.
    let terminalText: string;
    let copyCommandFailed = false;
    try {
      terminalText = await this.clipboardPreserver.preserve(async () => {
        // The VSCode API for this command does NOT return a value — no result to compare against.
        try {
          await this.ideAdapter.executeCommand(VSCODE_CMD_TERMINAL_COPY_SELECTION);
        } catch (e) {
          copyCommandFailed = true;
          throw e;
        }
        return this.ideAdapter.readTextFromClipboard();
      });
    } catch (error) {
      if (copyCommandFailed) {
        this.logger.error(
          { ...logCtx, terminalName: activeTerminal.name, error },
          'executeCommand(terminal.copySelection) threw',
        );
        this.ideAdapter.showErrorMessage(
          formatMessage(MessageCode.ERROR_TERMINAL_COPY_COMMAND_FAILED),
        );
        return { outcome: 'copy-command-failed', error };
      }
      this.logger.error(
        { ...logCtx, terminalName: activeTerminal.name, error },
        'readTextFromClipboard() threw',
      );
      this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TERMINAL_CLIPBOARD_READ_FAILED),
      );
      return { outcome: 'clipboard-read-failed', error };
    }

    if (!terminalText) {
      this.logger.debug(logCtx, 'No terminal text after clipboard roundtrip');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_TERMINAL_TEXT_SELECTED));
      return { outcome: 'no-text-selected' };
    }

    this.logger.debug(
      { ...logCtx, contentLength: terminalText.length },
      `Read ${terminalText.length} chars from terminal selection`,
    );

    const destinationBehavior = await this.clipboardRouter.resolveDestinationBehavior(logCtx);
    if (destinationBehavior === undefined) return { outcome: 'picker-cancelled' };

    const paddingMode = this.configReader.getPaddingMode(
      SETTING_SMART_PADDING_PASTE_CONTENT,
      DEFAULT_SMART_PADDING_PASTE_CONTENT,
    );

    await this.clipboardRouter.copyAndSendToDestination({
      control: {
        contentType: PasteContentType.Text,
        destinationBehavior,
      },
      content: {
        clipboard: terminalText,
        send: terminalText,
      },
      strategies: {
        sendFn: (text, basicStatusMessage) =>
          this.destinationManager.sendTextToDestination(text, basicStatusMessage, paddingMode),
        isEligibleFn: (destination, text) => destination.isEligibleForPasteContent(text),
      },
      contentName: formatMessage(MessageCode.CONTENT_NAME_SELECTED_TEXT),
      fnName: 'pasteTerminalSelectionToDestination',
    });

    return { outcome: 'success' };
  }

  /**
   * Bridge for R-L keybinding in terminal context.
   *
   * Delegates to pasteTerminalSelectionToDestination() (same as R-V),
   * then shows an informational tip nudging the user toward R-V directly.
   */
  async terminalLinkBridge(): Promise<void> {
    const logCtx = { fn: 'RangeLinkService.terminalLinkBridge' };
    this.logger.debug(logCtx, 'Bridging R-L to pasteTerminalSelectionToDestination');

    const result = await this.pasteTerminalSelectionToDestination();

    if (result.outcome === 'success') {
      this.ideAdapter.showInformationMessage(
        formatMessage(MessageCode.INFO_TERMINAL_LINK_BRIDGE_TIP),
      );
    }
  }

  /**
   * Guard for R-C keybinding in terminal context.
   *
   * R-C generates code location links, which require an editor selection.
   * In terminal context, show an error explaining this and suggest R-V instead.
   */
  terminalCopyLinkGuard(): void {
    const logCtx = { fn: 'RangeLinkService.terminalCopyLinkGuard' };
    this.logger.debug(logCtx, 'R-C pressed in terminal context');

    this.ideAdapter.showErrorMessage(
      formatMessage(MessageCode.ERROR_TERMINAL_COPY_LINK_NOT_SUPPORTED),
    );
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

    const destinationBehavior = await this.clipboardRouter.resolveDestinationBehavior(logCtx);
    if (destinationBehavior === undefined) return;

    const destinationFilePath = quotePath(filePath);

    if (destinationFilePath !== filePath) {
      this.logger.debug(
        { ...logCtx, before: filePath, after: destinationFilePath },
        'Quoted path for unsafe characters',
      );
    }

    await this.clipboardRouter.copyAndSendToDestination({
      control: {
        contentType: PasteContentType.Text,
        destinationBehavior,
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

    const referencePath = this.getReferencePath(document.uri, pathFormat);

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
      return this.ideAdapter.asRelativePath(uri, RelativePathFormat.PathOnly);
    }
    return uri.fsPath;
  }
}
