import { getLogger } from 'barebone-logger';
import {
  DelimiterConfig,
  formatLink,
  FormatOptions,
  InputSelection,
  LinkType,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { TerminalBindingManager } from './TerminalBindingManager';
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
    private readonly terminalBindingManager: TerminalBindingManager,
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
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return null;
    }

    const document = editor.document;
    const selections = editor.selections;

    if (!selections || selections.length === 0 || selections.every((s) => s.isEmpty)) {
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
      vscode.window.showErrorMessage(`RangeLink: ${message}`);
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
      vscode.window.showErrorMessage(`RangeLink: Failed to generate ${linkType}`);
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
   * @param link The link text to copy
   * @param linkTypeName User-friendly name for status messages (e.g., "RangeLink", "Portable RangeLink")
   */
  private async copyAndNotify(link: string, linkTypeName: string): Promise<void> {
    await vscode.env.clipboard.writeText(link);

    let statusMessage = `✓ ${linkTypeName} copied to clipboard`;
    // Send to bound terminal if one is bound
    if (this.terminalBindingManager && this.terminalBindingManager.isBound()) {
      const sent = this.terminalBindingManager.sendToTerminal(link);
      if (sent) {
        const terminal = this.terminalBindingManager.getBoundTerminal();
        const terminalName = terminal?.name || 'terminal';
        vscode.window.setStatusBarMessage(`${statusMessage} & sent to ${terminalName}`, 2000);
      } else {
        // Unexpected: binding exists but send failed
        getLogger().error(
          { fn: 'copyAndNotify', linkTypeName },
          'Failed to send link to bound terminal (terminal may have closed)',
        );
        vscode.window.showWarningMessage(`${statusMessage}; BUT failed to send to bound terminal.`);
      }
    } else {
      vscode.window.setStatusBarMessage(statusMessage, 2000);
    }
  }

  /**
   * Gets the reference path based on the path format preference
   */
  private getReferencePath(document: vscode.TextDocument, pathFormat: PathFormat): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (workspaceFolder && pathFormat === PathFormat.WorkspaceRelative) {
      return vscode.workspace.asRelativePath(document.uri);
    }
    return document.uri.fsPath;
  }
}
