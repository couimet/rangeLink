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
import { toInputSelection } from './utils/toInputSelection';

export enum PathFormat {
  WorkspaceRelative = 'workspace-relative',
  Absolute = 'absolute',
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
    const editor = this.validateActiveTextEditor();
    if (!editor) {
      return;
    }

    const selections = editor.selections;

    // Check for empty selections
    if (!selections || selections.length === 0 || selections.every((s) => s.isEmpty)) {
      this.ideAdapter.showErrorMessage('RangeLink: No text selected. Select text and try again.');
      return;
    }

    // Extract selected text (concatenate with newlines for multi-selection)
    // Note: guaranteed to have at least one non-empty selection after check above
    const selectedTexts = selections
      .filter((s) => !s.isEmpty)
      .map((s) => editor.document.getText(s));

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
    const editor = this.validateActiveTextEditor();
    if (!editor) {
      return null;
    }

    const document = editor.document;
    const selections = editor.selections;

    if (!selections || selections.length === 0 || selections.every((s) => s.isEmpty)) {
      // TODO: Replace with RangeLinkExtensionError using RangeLinkExtensionErrorCodes.EMPTY_SELECTION
      throw new Error('RangeLink command invoked with empty selection');
    }

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
    );
  }

  /**
   * Validates that an active text editor exists and shows error message if not.
   *
   * This utility ensures consistent error messaging across all methods that require
   * an active editor. Prevents drift in error messages.
   *
   * @returns The active text editor, or undefined if none exists
   */
  private validateActiveTextEditor(): vscode.TextEditor | undefined {
    const editor = this.ideAdapter.activeTextEditor;
    if (!editor) {
      this.ideAdapter.showErrorMessage('RangeLink: No active editor');
    }
    return editor;
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
   * Eliminates duplication between pasteSelectedTextToDestination and copyToClipboardAndDestination.
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
   */
  private async copyAndSendToDestination<T>(
    clipboardContent: string,
    sendContent: T,
    sendFn: (content: T) => Promise<boolean>,
    isEligibleFn: (destination: PasteDestination, content: T) => Promise<boolean>,
    contentName: string,
    fnName: string,
  ): Promise<void> {
    // Copy to clipboard
    await this.ideAdapter.writeTextToClipboard(clipboardContent);

    // Check if destination is bound
    if (!this.destinationManager.isBound()) {
      getLogger().info({ fn: fnName }, 'No destination bound - copied to clipboard only');
      this.ideAdapter.setStatusBarMessage(`✓ ${contentName} copied to clipboard`, 2000);
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
      this.ideAdapter.setStatusBarMessage(`✓ ${contentName} copied to clipboard`, 2000);
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
        this.ideAdapter.setStatusBarMessage(`✓ ${contentName} copied to clipboard`, 2000);
        void this.ideAdapter.showInformationMessage(
          `${contentName} copied to clipboard. ${userInstruction}`,
        );
      } else {
        // Automatic destination: Show status bar only
        this.ideAdapter.setStatusBarMessage(
          `✓ ${contentName} copied to clipboard & sent to ${displayName}`,
          2000,
        );
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
