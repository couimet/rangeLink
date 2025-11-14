import { getLogger } from 'barebone-logger';
import {
  DelimiterConfig,
  formatLink,
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
    const link = await this.generateLinkFromSelection(pathFormat, false);
    if (link) {
      await this.copyAndNotify(link, 'RangeLink');
    }
  }

  /**
   * Creates a portable RangeLink with embedded delimiter metadata
   */
  async createPortableLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const link = await this.generateLinkFromSelection(pathFormat, true);
    if (link) {
      await this.copyAndNotify(link, 'Portable RangeLink');
    }
  }

  /**
   * Generates a link from the current editor selection
   * @param pathFormat Whether to use relative or absolute paths
   * @param isPortable Whether to generate a portable link with embedded delimiters
   * @returns The generated link, or null if generation failed
   */
  private async generateLinkFromSelection(
    pathFormat: PathFormat,
    isPortable: boolean,
  ): Promise<string | null> {
    const editor = this.ideAdapter.activeTextEditor;
    if (!editor) {
      this.ideAdapter.showErrorMessage('No active editor');
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

    return formattedLink.link;
  }

  /**
   * Copies the link to clipboard and shows status bar notification
   *
   * **Auto-paste behavior (text editor destination):**
   * - Skips auto-paste if creating link FROM the bound editor itself
   * - Shows "not topmost" warning if bound editor hidden behind other tabs
   * - Pastes successfully if bound editor is topmost in its tab group
   *
   * @param link The link text to copy
   * @param linkTypeName User-friendly name for status messages (e.g., "RangeLink", "Portable RangeLink")
   */
  private async copyAndNotify(link: string, linkTypeName: string): Promise<void> {
    await this.ideAdapter.writeTextToClipboard(link);

    const statusMessage = `✓ ${linkTypeName} copied to clipboard`;

    // Send to bound destination if one is bound
    if (this.destinationManager.isBound()) {
      const destination = this.destinationManager.getBoundDestination();
      const displayName = destination?.displayName || 'destination';

      // Skip auto-paste if creating link FROM the bound editor itself
      if (destination?.id === 'text-editor') {
        const textEditorDest = destination as any; // TextEditorDestination
        const boundDocumentUri = textEditorDest.getBoundDocumentUri();
        const activeEditor = this.ideAdapter.activeTextEditor;

        if (activeEditor && boundDocumentUri) {
          const activeDocumentUri = activeEditor.document.uri.toString();
          const boundUriString = boundDocumentUri.toString();

          if (activeDocumentUri === boundUriString) {
            // Creating link FROM bound editor - skip auto-paste
            getLogger().debug(
              {
                fn: 'copyAndNotify',
                linkTypeName,
                boundDocumentUri: boundUriString,
              },
              'Skipping auto-paste: creating link from bound editor itself',
            );
            this.ideAdapter.setStatusBarMessage(statusMessage, 2000);
            return;
          }
        }
      }

      getLogger().debug(
        { fn: 'copyAndNotify', linkTypeName, boundDestination: displayName },
        `Attempting to send link to bound destination: ${displayName}`,
      );

      const sent = await this.destinationManager.sendToDestination(link);
      if (sent) {
        this.ideAdapter.setStatusBarMessage(`${statusMessage} & sent to ${displayName}`, 2000);
      } else {
        // Paste failed - show destination-aware error message
        getLogger().warn(
          { fn: 'copyAndNotify', linkTypeName, boundDestination: displayName },
          'Failed to send link to bound destination',
        );
        const errorMessage = destination
          ? this.buildPasteFailureMessage(destination)
          : 'RangeLink: Copied to clipboard. Could not send to destination.';
        this.ideAdapter.showWarningMessage(errorMessage);
      }
      return;
    }

    // No destination bound - just show clipboard message
    this.ideAdapter.setStatusBarMessage(statusMessage, 2000);
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
