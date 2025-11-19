import { getLogger } from 'barebone-logger';
import {
  DelimiterConfig,
  formatLink,
  type FormattedLink,
  FormatOptions,
  InputSelection,
  LinkType,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { PasteDestination } from './destinations/PasteDestination';
import type { PasteDestinationManager } from './destinations/PasteDestinationManager';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { ActiveSelections } from './types/ActiveSelections';
import { MessageCode } from './types/MessageCode';
import { formatMessage } from './utils/formatMessage';
import { toInputSelection } from './utils/toInputSelection';

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
 * RangeLinkService: VSCode-specific orchestration layer
 * Core logic is handled by rangelink-core-ts functions
 */
export class RangeLinkService {
  constructor(
    private readonly delimiters: DelimiterConfig,
    private readonly ideAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
  ) {}

  /**
   * Creates a standard RangeLink from the current editor selection
   */
  async createLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const formattedLink = await this.generateLinkFromSelection(pathFormat, false);
    if (formattedLink) {
      await this.copyToClipboardAndDestination(formattedLink, 'RangeLink');
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
      await this.copyAndSendToDestination(
        formattedLink.link,
        formattedLink,
        () => Promise.resolve(false), // No-op (never called due to ClipboardOnly)
        () => Promise.resolve(false), // No-op (never called)
        'RangeLink',
        'createLinkOnly',
        DestinationBehavior.ClipboardOnly,
      );
    }
  }

  /**
   * Creates a portable RangeLink with embedded delimiter metadata
   */
  async createPortableLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const formattedLink = await this.generateLinkFromSelection(pathFormat, true);
    if (formattedLink) {
      await this.copyToClipboardAndDestination(formattedLink, 'Portable RangeLink');
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
    const validated = this.validateSelectionsAndShowError();
    if (!validated) {
      return;
    }

    const { editor, selections } = validated;

    // Extract selected text (concatenate with newlines for multi-selection)
    const selectedTexts = selections.map((s) => editor.document.getText(s));
    const content = selectedTexts.join('\n');

    getLogger().debug(
      {
        fn: 'pasteSelectedTextToDestination',
        selectionCount: selectedTexts.length,
        contentLength: content.length,
      },
      `Extracted ${content.length} chars from ${selectedTexts.length} selection(s)`,
    );

    await this.copyAndSendToDestination(
      content,
      content,
      (text) => this.destinationManager.sendTextToDestination(text),
      (destination, text) => destination.isEligibleForPasteContent(text),
      'Selected text',
      'pasteSelectedTextToDestination',
    );
  }

  /**
   * Generates a link from the current editor selection
   * @param pathFormat Whether to use relative or absolute paths
   * @param isPortable Whether to generate a portable link with embedded delimiters
   * @returns The generated FormattedLink with metadata, or null if generation failed
   */
  private async generateLinkFromSelection(
    pathFormat: PathFormat,
    isPortable: boolean,
  ): Promise<FormattedLink | null> {
    const validated = this.validateSelectionsAndShowError();
    if (!validated) {
      return null;
    }

    const { editor, selections } = validated;
    const document = editor.document;

    const referencePath = this.getReferencePath(document, pathFormat);

    let inputSelection: InputSelection;
    try {
      inputSelection = toInputSelection(editor, selections);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process selection';
      getLogger().error(
        { fn: 'generateLinkFromSelection', error },
        'Failed to convert selections to InputSelection',
      );
      this.ideAdapter.showErrorMessage(`RangeLink: ${message}`);
      return null;
    }

    const options: FormatOptions = {
      linkType: isPortable ? LinkType.Portable : LinkType.Regular,
    };

    const result = formatLink(referencePath, inputSelection, this.delimiters, options);

    if (!result.success) {
      const linkType = isPortable ? 'portable link' : 'link';
      getLogger().error(
        { fn: 'generateLinkFromSelection', errorCode: result.error },
        `Failed to generate ${linkType}`,
      );
      this.ideAdapter.showErrorMessage(`RangeLink: Failed to generate ${linkType}`);
      return null;
    }

    const formattedLink = result.value;
    getLogger().info(
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
   * - Shows "not topmost" warning if bound editor hidden behind other tabs
   * - Pastes successfully if bound editor is topmost in its tab group
   *
   * @param formattedLink The formatted RangeLink with metadata
   * @param linkTypeName User-friendly name for status messages (e.g., "RangeLink", "Portable RangeLink")
   */
  private async copyToClipboardAndDestination(
    formattedLink: FormattedLink,
    linkTypeName: string,
  ): Promise<void> {
    await this.copyAndSendToDestination(
      formattedLink.link,
      formattedLink,
      (link) => this.destinationManager.sendToDestination(link),
      (destination, link) => destination.isEligibleForPasteLink(link),
      linkTypeName,
      'copyToClipboardAndDestination',
      DestinationBehavior.BoundDestination,
    );
  }

  /**
   * Validates that active editor exists with non-empty selections and shows appropriate error if not.
   *
   * Consolidates duplicate validation logic from generateLinkFromSelection and other methods.
   * Shows context-appropriate error message based on failure reason:
   * - No active editor: "RangeLink: No active editor"
   * - Empty selections: "RangeLink: No text selected. Select text and try again."
   *
   * @returns Object with editor and selections if valid, undefined if validation failed
   */
  private validateSelectionsAndShowError():
    | { editor: vscode.TextEditor; selections: readonly vscode.Selection[] }
    | undefined {
    const activeSelections = ActiveSelections.create(this.ideAdapter.activeTextEditor);
    const nonEmptySelections = activeSelections.getNonEmptySelections();

    if (!nonEmptySelections) {
      const errorMsg = activeSelections.editor
        ? 'RangeLink: No text selected. Select text and try again.'
        : 'RangeLink: No active editor';

      getLogger().debug(
        {
          fn: 'validateSelectionsAndShowError',
          hasEditor: !!activeSelections.editor,
          errorMsg,
        },
        'Empty selection detected - should be prevented by command enablement',
      );

      this.ideAdapter.showErrorMessage(errorMsg);
      return undefined;
    }

    // Safe: getNonEmptySelections() returning non-null guarantees editor exists
    return { editor: activeSelections.editor!, selections: nonEmptySelections };
  }

  /**
   * Gets the reference path based on the path format preference
   */
  private getReferencePath(document: vscode.TextDocument, pathFormat: PathFormat): string {
    const workspaceFolder = this.ideAdapter.getWorkspaceFolder(document.uri);
    if (workspaceFolder && pathFormat === PathFormat.WorkspaceRelative) {
      return this.ideAdapter.asRelativePath(document.uri);
    }
    return document.uri.fsPath;
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
   *
   * @param clipboardContent - String content to copy to clipboard
   * @param sendContent - Content to send to destination (may differ from clipboard)
   * @param sendFn - Function to send content to destination manager
   * @param isEligibleFn - Function to check if content is eligible for paste to destination
   * @param contentName - User-friendly name for the content (e.g., "RangeLink", "Selected text")
   * @param fnName - Function name for logging
   * @param destinationBehavior - Controls whether to send to bound destination or clipboard-only
   */
  private async copyAndSendToDestination<T>(
    clipboardContent: string,
    sendContent: T,
    sendFn: (content: T) => Promise<boolean>,
    isEligibleFn: (destination: PasteDestination, content: T) => Promise<boolean>,
    contentName: string,
    fnName: string,
    destinationBehavior: DestinationBehavior = DestinationBehavior.BoundDestination,
  ): Promise<void> {
    // Copy to clipboard
    await this.ideAdapter.writeTextToClipboard(clipboardContent);

    const basicStatusMessage = formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, {
      linkTypeName: contentName,
    });

    // Early return if skipping destination (either forced or not bound)
    const shouldSkipDestination =
      destinationBehavior === DestinationBehavior.ClipboardOnly ||
      !this.destinationManager.isBound();

    if (shouldSkipDestination) {
      const reason =
        destinationBehavior === DestinationBehavior.ClipboardOnly
          ? 'Skipping destination (clipboard-only command)'
          : 'No destination bound - copied to clipboard only';
      getLogger().info({ fn: fnName }, reason);
      this.ideAdapter.setStatusBarMessage(basicStatusMessage);
      return;
    }

    // Safe: isBound() guarantees getBoundDestination() returns non-undefined
    const destination = this.destinationManager.getBoundDestination()!;
    const displayName = destination.displayName || 'destination';

    // Check eligibility before sending
    const isEligible = await isEligibleFn(destination, sendContent);
    if (!isEligible) {
      getLogger().debug(
        { fn: fnName, boundDestination: displayName },
        'Content not eligible for paste - skipping auto-paste',
      );
      this.ideAdapter.setStatusBarMessage(basicStatusMessage);
      return;
    }

    getLogger().debug(
      { fn: fnName, boundDestination: displayName },
      `Attempting to send content to bound destination: ${displayName}`,
    );

    // Send to bound destination
    const sent = await sendFn(sendContent);

    if (sent) {
      // Check if destination requires manual paste
      const userInstruction = destination.getUserInstruction();

      if (userInstruction) {
        // Clipboard-based destination: Show status bar + information popup
        this.ideAdapter.setStatusBarMessage(basicStatusMessage);
        void this.ideAdapter.showInformationMessage(`${basicStatusMessage}. ${userInstruction}`);
      } else {
        // Automatic destination: Show status bar only
        this.ideAdapter.setStatusBarMessage(`${basicStatusMessage} & sent to ${displayName}`);
      }
    } else {
      // Paste failed - show destination-aware error message
      getLogger().warn(
        { fn: fnName, boundDestination: displayName },
        'Failed to send to destination',
      );
      const errorMessage = this.buildPasteFailureMessage(destination);
      this.ideAdapter.showWarningMessage(errorMessage);
    }
  }

  /**
   * Build destination-aware error message for paste failures
   *
   * Provides specific guidance based on the destination type that failed.
   * Text editor failures mention "hidden behind tabs", terminal failures mention
   * closure/input issues, AI assistant failures suggest keyboard shortcuts, etc.
   *
   * @param destination - The destination that failed to receive the paste
   * @returns User-friendly error message with destination-specific guidance
   */
  private buildPasteFailureMessage(destination: PasteDestination): string {
    const baseMessage = 'RangeLink: Copied to clipboard.';

    switch (destination.id) {
      case 'text-editor':
        return `${baseMessage} Bound editor is hidden behind other tabs - make it active to resume auto-paste.`;

      case 'terminal':
        return `${baseMessage} Could not send to terminal. Terminal may be closed or not accepting input.`;

      case 'claude-code':
        return `${baseMessage} Could not open Claude Code chat. Try opening it manually (Cmd+Escape).`;

      case 'cursor-ai':
        return `${baseMessage} Could not open Cursor AI chat. Try opening it manually (Cmd+L).`;

      default:
        return `${baseMessage} Could not send to ${destination.displayName}.`;
    }
  }
}
