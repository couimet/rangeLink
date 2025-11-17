import type { Logger } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { applySmartPadding } from '../utils/applySmartPadding';
import { isEligibleForPaste } from '../utils/isEligibleForPaste';

import type { DestinationType, PasteDestination } from './PasteDestination';

/**
 * Text Editor destination implementation for pasting RangeLinks
 *
 * Pastes RangeLinks at cursor position in the active text editor.
 * Tracks specific editor (similar to TerminalDestination) and auto-unbinds on editor close.
 *
 * **File type restrictions:**
 * - Only allows text-like files (file:// and untitled:// schemes)
 * - Blocks known binary extensions (.png, .pdf, .zip, etc.)
 *
 * **Path display:**
 * - User-facing messages: workspace-relative path (e.g., "src/file.ts" or "Untitled-1")
 * - Logs: both workspace-relative and absolute paths for debugging
 */
export class TextEditorDestination implements PasteDestination {
  readonly id: DestinationType = 'text-editor';
  readonly displayName = 'Text Editor';

  // Known binary file extensions to block
  private static readonly BINARY_EXTENSIONS = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.bmp',
    '.ico',
    '.svg',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
    '.7z',
    '.rar',
    '.exe',
    '.dll',
    '.bin',
    '.dat',
    '.db',
    '.sqlite',
  ];

  private boundDocumentUri: vscode.Uri | undefined;

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * Check if text editor destination is available (has bound document)
   */
  async isAvailable(): Promise<boolean> {
    return this.boundDocumentUri !== undefined;
  }

  /**
   * Check if RangeLink is eligible for paste to text editor
   *
   * Returns false if creating link FROM the bound editor itself (self-paste detection).
   * This prevents auto-pasting when user creates a link in the same editor they want to paste to.
   *
   * @param _formattedLink - The formatted RangeLink (unused - self-paste check doesn't depend on link content)
   * @returns Promise resolving to true if eligible, false if self-paste detected
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteLink(_formattedLink: FormattedLink): Promise<boolean> {
    return this.checkSelfPasteEligibility(
      'isEligibleForPasteLink',
      'creating link FROM bound editor',
    );
  }

  /**
   * Check if text content is eligible for paste to text editor
   *
  /**
   * Check self-paste eligibility (shared logic for link and content)
   *
   * Prevents auto-pasting when source editor matches bound editor.
   * Extracted to eliminate duplication between isEligibleForPasteLink and isEligibleForPasteContent.
   *
   * @param fnName - Function name for logging context
   * @param actionDescription - Description of action (e.g., "creating link FROM bound editor")
   * @returns true if eligible, false if self-paste detected or destination unavailable
   */
  private checkSelfPasteEligibility(fnName: string, actionDescription: string): boolean {
    // Get active editor (source of link/text creation)
    const activeEditor = this.ideAdapter.activeTextEditor;

    // If no active editor, can't be self-paste
    if (!activeEditor) {
      return true;
    }

    // If no bound document, not eligible (destination not available)
    if (!this.boundDocumentUri) {
      return false;
    }

    // Self-paste detection: Compare active editor's document URI with bound document URI
    const isSelfPaste = activeEditor.document.uri.toString() === this.boundDocumentUri.toString();

    if (isSelfPaste) {
      this.logger.debug(
        {
          fn: `TextEditorDestination.${fnName}`,
          activeDocumentUri: activeEditor.document.uri.toString(),
          boundDocumentUri: this.boundDocumentUri.toString(),
        },
        `Self-paste detected - skipping auto-paste (${actionDescription})`,
      );
      return false;
    }

    return true;
  }

  /**
   * Check if text content is eligible to be pasted to text editor
   *
   * Similar to isEligibleForPasteLink(), checks if source editor matches bound editor
   * to prevent self-paste loops.
   *
   * @param _content - The text content (unused - self-paste check doesn't depend on content)
   * @returns Promise resolving to true if eligible, false if self-paste detected
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteContent(_content: string): Promise<boolean> {
    return this.checkSelfPasteEligibility('isEligibleForPasteContent', 'selecting text FROM bound editor');
  }

  /**
   * Get user instruction for manual paste
   *
   * Text editor performs automatic paste, so no manual instruction is needed.
   *
   * @returns undefined (no manual instruction needed)
   */
  getUserInstruction(): string | undefined {
    return undefined;
  }

  /**
   * Paste a RangeLink to bound text editor at cursor position with smart padding
   *
   * **Tab Group Binding Strategy (MVP):**
   * - Requires 2+ tab groups (split editor)
   * - Bound document must be topmost (active tab) in its tab group
   * - Dynamically finds bound document across all tab groups
   * - Allows user to move bound document between tab groups
   * - Skips auto-paste when creating link FROM bound editor itself
   *
   * **Lazy Validation:**
   * - Only validates on paste attempt (no event listeners for tab switches)
   * - Shows warning if bound document not topmost (keeps binding intact)
   * - User can switch back to make document topmost again
   *
   * **Smart padding behavior:**
   * - Only adds leading space if link doesn't start with whitespace
   * - Only adds trailing space if link doesn't end with whitespace
   * - Consistent with TerminalDestination behavior
   *
   * **Auto-focus behavior:**
   * - After successful paste, focuses the bound editor
   * - Consistent with TerminalDestination and AI assistant destinations
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns true if paste succeeded, false if validation failed or cannot paste
   */
  async pasteLink(formattedLink: FormattedLink): Promise<boolean> {
    const link = formattedLink.link;

    if (!isEligibleForPaste(link)) {
      this.logger.info(
        { fn: 'TextEditorDestination.pasteLink', formattedLink, linkLength: link.length },
        'Link not eligible for paste',
      );
      return false;
    }

    if (!this.boundDocumentUri) {
      this.logger.warn(
        { fn: 'TextEditorDestination.pasteLink', formattedLink, linkLength: link.length },
        'Cannot paste: No text editor bound',
      );
      return false;
    }

    // Get display name for logging and messages
    const boundDisplayName = this.getEditorDisplayName();

    // LAZY VALIDATION: Find which tab group contains the bound document
    const boundTabGroup = this.ideAdapter.findTabGroupForDocument(this.boundDocumentUri);

    if (!boundTabGroup) {
      // Document not found in any tab group - likely closed or tab group closed
      this.logger.error(
        {
          fn: 'TextEditorDestination.pasteLink',
          boundDocumentUri: this.boundDocumentUri.toString(),
          boundDisplayName,
        },
        'Bound document not found in any tab group - likely closed',
      );
      // Return false to trigger unbind in PasteDestinationManager
      return false;
    }

    // Check if bound document is the active (topmost) tab in its group
    const activeTab = boundTabGroup.activeTab;
    if (!activeTab) {
      this.logger.warn(
        { fn: 'TextEditorDestination.pasteLink', boundDisplayName },
        'Tab group has no active tab',
      );
      return false;
    }

    if (!this.ideAdapter.isTextEditorTab(activeTab)) {
      this.logger.warn(
        {
          fn: 'TextEditorDestination.pasteLink',
          boundDisplayName,
          tabInputType: typeof activeTab.input,
        },
        'Active tab is not a text editor',
      );
      return false;
    }

    if (activeTab.input.uri.toString() !== this.boundDocumentUri.toString()) {
      // Bound document exists but is not topmost - show warning but keep binding
      this.logger.warn(
        {
          fn: 'TextEditorDestination.pasteLink',
          boundDocumentUri: this.boundDocumentUri.toString(),
          activeTabUri: activeTab.input.uri.toString(),
          boundDisplayName,
        },
        'Bound document is not topmost in its tab group',
      );
      return false;
    }

    // Find the TextEditor object for the active tab (we've already validated it matches bound document)
    const editor = this.ideAdapter.visibleTextEditors.find(
      (e) => e.document.uri.toString() === activeTab.input.uri.toString(),
    );

    if (!editor) {
      this.logger.error(
        {
          fn: 'TextEditorDestination.pasteLink',
          boundDocumentUri: this.boundDocumentUri.toString(),
          boundDisplayName,
        },
        'Bound document is topmost but TextEditor object not found in visibleTextEditors',
      );
      return false;
    }

    // All validations passed - perform the paste
    try {
      const paddedLink = applySmartPadding(link);

      const success = await editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.active, paddedLink);
      });

      if (!success) {
        this.logger.error(
          {
            fn: 'TextEditorDestination.pasteLink',
            boundDisplayName,
            boundDocumentUri: this.boundDocumentUri.toString(),
            linkLength: link.length,
          },
          'Edit operation failed',
        );
        return false;
      }

      // Focus the editor (similar to terminal.show(false) behavior)
      await this.ideAdapter.showTextDocument(editor.document.uri, {
        preserveFocus: false, // Steal focus to bring user to paste destination
        viewColumn: editor.viewColumn, // Keep in same tab group
      });

      this.logger.info(
        {
          fn: 'TextEditorDestination.pasteLink',
          boundDisplayName,
          boundDocumentUri: this.boundDocumentUri.toString(),
          formattedLink,
          originalLength: link.length,
          paddedLength: paddedLink.length,
        },
        `Pasted link to text editor: ${boundDisplayName}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        {
          fn: 'TextEditorDestination.pasteLink',
          boundDisplayName,
          boundDocumentUri: this.boundDocumentUri.toString(),
          formattedLink,
          error,
        },
        'Failed to paste link to text editor',
      );
      return false;
    }
  }

  /**
   * Find which tab group contains the given document URI
   *
   * Dynamically searches all tab groups to find the one containing the document.
   * This allows the bound document to be moved between tab groups.
   *
   * @param documentUri - The document URI to search for
   * @returns The tab group containing the document, or undefined if not found
   */
  private findTabGroupContainingDocument(documentUri: vscode.Uri): vscode.TabGroup | undefined {
    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        // Only check text editor tabs (skip terminals, etc.)
        if (tab.input instanceof vscode.TabInputText) {
          if (tab.input.uri.toString() === documentUri.toString()) {
            return tabGroup;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Paste text content to bound text editor at cursor position with smart padding
   *
   * Similar to pasteLink() but accepts raw text content instead of FormattedLink.
   * Uses the same tab group binding strategy and validation as pasteLink().
   *
   * @param content - The text content to paste
   * @returns true if paste succeeded, false otherwise
   */
  async pasteContent(content: string): Promise<boolean> {
    if (!isEligibleForPaste(content)) {
      this.logger.info(
        { fn: 'TextEditorDestination.pasteContent', contentLength: content.length },
        'Content not eligible for paste',
      );
      return false;
    }

    if (!this.boundDocumentUri) {
      this.logger.warn(
        { fn: 'TextEditorDestination.pasteContent', contentLength: content.length },
        'Cannot paste: No text editor bound',
      );
      return false;
    }

    const boundDisplayName = this.getEditorDisplayName();

    // LAZY VALIDATION: Find which tab group contains the bound document
    const boundTabGroup = this.ideAdapter.findTabGroupForDocument(this.boundDocumentUri);

    if (!boundTabGroup) {
      this.logger.error(
        {
          fn: 'TextEditorDestination.pasteContent',
          boundDocumentUri: this.boundDocumentUri.toString(),
          boundDisplayName,
        },
        'Bound document not found in any tab group - likely closed',
      );
      return false;
    }

    // Check if bound document is the active (topmost) tab in its group
    const activeTab = boundTabGroup.activeTab;
    if (!activeTab) {
      this.logger.warn(
        { fn: 'TextEditorDestination.pasteContent', boundDisplayName },
        'Tab group has no active tab',
      );
      return false;
    }

    // Check that active tab is a text editor (not terminal)
    if (!this.ideAdapter.isTextEditorTab(activeTab)) {
      this.logger.warn(
        {
          fn: 'TextEditorDestination.pasteContent',
          boundDisplayName,
          tabInputType: typeof activeTab.input,
        },
        'Active tab is not a text editor',
      );
      return false;
    }

    const activeTabUri = (activeTab.input as any).uri;
    if (activeTabUri.toString() !== this.boundDocumentUri.toString()) {
      this.logger.warn(
        {
          fn: 'TextEditorDestination.pasteContent',
          boundDocumentUri: this.boundDocumentUri.toString(),
          activeTabUri: activeTabUri.toString(),
          boundDisplayName,
        },
        'Bound document is not topmost in its tab group',
      );
      return false;
    }

    // Find the TextEditor object for the bound document
    const editor = this.ideAdapter.visibleTextEditors.find(
      (e) => e.document.uri.toString() === this.boundDocumentUri!.toString(),
    );

    if (!editor) {
      this.logger.error(
        {
          fn: 'TextEditorDestination.pasteContent',
          boundDocumentUri: this.boundDocumentUri.toString(),
          boundDisplayName,
        },
        'Bound document is topmost but TextEditor object not found in visibleTextEditors',
      );
      return false;
    }

    // All validations passed - perform the paste
    try {
      const paddedContent = applySmartPadding(content);

      const success = await editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.active, paddedContent);
      });

      if (!success) {
        this.logger.error(
          {
            fn: 'TextEditorDestination.pasteContent',
            boundDisplayName,
            boundDocumentUri: this.boundDocumentUri.toString(),
            contentLength: content.length,
          },
          'Edit operation failed',
        );
        return false;
      }

      // Focus the editor (similar to terminal.show(false) behavior)
      await this.ideAdapter.showTextDocument(editor.document.uri, {
        preserveFocus: false,
        viewColumn: editor.viewColumn,
      });

      this.logger.info(
        {
          fn: 'TextEditorDestination.pasteContent',
          boundDisplayName,
          boundDocumentUri: this.boundDocumentUri.toString(),
          originalLength: content.length,
          paddedLength: paddedContent.length,
        },
        `Pasted content to text editor: ${boundDisplayName}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        {
          fn: 'TextEditorDestination.pasteContent',
          boundDisplayName,
          boundDocumentUri: this.boundDocumentUri.toString(),
          error,
        },
        'Exception during paste operation',
      );
      return false;
    }
  }

  /**
   * Update bound document URI
   *
   * Called by PasteDestinationManager when user binds/unbinds text editor.
   * This is external state management - the manager owns the binding logic.
   *
   * Stores only the document URI (not the editor reference) to enable:
   * - Dynamic tab group lookup (user can move document between groups)
   * - Lazy validation (only check topmost status on paste)
   *
   * @param editor - The editor to bind, or undefined to unbind
   */
  setEditor(editor: vscode.TextEditor | undefined): void {
    this.boundDocumentUri = editor ? editor.document.uri : undefined;

    if (editor) {
      const displayName = this.getEditorDisplayName();
      const path = this.getEditorPath();
      this.logger.debug(
        { fn: 'TextEditorDestination.setEditor', editorDisplayName: displayName, editorPath: path },
        `Text editor bound: ${displayName}`,
      );
    } else {
      this.logger.debug({ fn: 'TextEditorDestination.setEditor' }, 'Text editor unbound');
    }
  }

  /**
   * Get bound document URI
   *
   * @returns The bound document URI or undefined if none bound
   */
  getBoundDocumentUri(): vscode.Uri | undefined {
    return this.boundDocumentUri;
  }

  /**
   * Get user-friendly display name for bound document (workspace-relative)
   *
   * Returns workspace-relative path for file:// scheme, or "Untitled-N" for untitled files.
   * Used in user-facing status messages and notifications.
   *
   * @returns Workspace-relative path or "Untitled-N", or undefined if no document bound
   */
  getEditorDisplayName(): string | undefined {
    if (!this.boundDocumentUri) {
      return undefined;
    }

    // Handle untitled files
    if (this.boundDocumentUri.scheme === 'untitled') {
      return `Untitled-${this.boundDocumentUri.path.replace(/^\//, '')}`;
    }

    // Get workspace-relative path for file:// scheme
    const workspaceFolder = this.ideAdapter.getWorkspaceFolder(this.boundDocumentUri);
    if (workspaceFolder) {
      const relativePath = this.ideAdapter.asRelativePath(this.boundDocumentUri, false);
      return relativePath;
    }

    // Fallback to filename if not in workspace
    return this.boundDocumentUri.fsPath.split('/').pop() || 'Unknown';
  }

  /**
   * Get absolute path for bound document (for logging)
   *
   * Returns full absolute path for debugging and log analysis.
   *
   * @returns Absolute path, or undefined if no document bound
   */
  getEditorPath(): string | undefined {
    if (!this.boundDocumentUri) {
      return undefined;
    }

    return this.boundDocumentUri.toString();
  }

  /**
   * Check if editor is a text-like file (not binary)
   *
   * **Restrictions:**
   * - Only allows file:// and untitled:// schemes
   * - Blocks known binary extensions
   *
   * @param editor - The editor to check
   * @returns true if editor is text-like, false if binary or invalid scheme
   */
  static isTextLikeFile(editor: vscode.TextEditor): boolean {
    const scheme = editor.document.uri.scheme;

    // Only allow file:// and untitled:// schemes
    const isTextScheme = scheme === 'file' || scheme === 'untitled';
    if (!isTextScheme) {
      return false;
    }

    // For untitled files, always allow
    if (scheme === 'untitled') {
      return true;
    }

    // Check for binary extensions
    const path = editor.document.uri.fsPath.toLowerCase();
    const isBinary = TextEditorDestination.BINARY_EXTENSIONS.some((ext) => path.endsWith(ext));

    return !isBinary;
  }
}
