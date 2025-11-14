import type { Logger } from 'barebone-logger';
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
   * Paste text to bound text editor at cursor position with smart padding
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
   * - Only adds leading space if text doesn't start with whitespace
   * - Only adds trailing space if text doesn't end with whitespace
   * - Consistent with TerminalDestination behavior
   *
   * **Auto-focus behavior:**
   * - After successful paste, focuses the bound editor
   * - Consistent with TerminalDestination and AI assistant destinations
   *
   * @param text - The text to paste
   * @returns true if paste succeeded, false if validation failed or cannot paste
   */
  async paste(text: string): Promise<boolean> {
    if (!isEligibleForPaste(text)) {
      this.logger.info({ fn: 'TextEditorDestination.paste', text }, 'Text not eligible for paste');
      return false;
    }

    if (!this.boundDocumentUri) {
      this.logger.warn(
        { fn: 'TextEditorDestination.paste', textLength: text.length },
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
          fn: 'TextEditorDestination.paste',
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
        { fn: 'TextEditorDestination.paste', boundDisplayName },
        'Tab group has no active tab',
      );
      return false;
    }

    if (!this.ideAdapter.isTextEditorTab(activeTab)) {
      this.logger.warn(
        {
          fn: 'TextEditorDestination.paste',
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
          fn: 'TextEditorDestination.paste',
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
          fn: 'TextEditorDestination.paste',
          boundDocumentUri: this.boundDocumentUri.toString(),
          boundDisplayName,
        },
        'Bound document is topmost but TextEditor object not found in visibleTextEditors',
      );
      return false;
    }

    // All validations passed - perform the paste
    try {
      const paddedText = applySmartPadding(text);

      const success = await editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.active, paddedText);
      });

      if (!success) {
        this.logger.error(
          {
            fn: 'TextEditorDestination.paste',
            boundDisplayName,
            boundDocumentUri: this.boundDocumentUri.toString(),
            textLength: text.length,
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
          fn: 'TextEditorDestination.paste',
          boundDisplayName,
          boundDocumentUri: this.boundDocumentUri.toString(),
          originalLength: text.length,
          paddedLength: paddedText.length,
        },
        `Pasted to text editor: ${boundDisplayName}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        {
          fn: 'TextEditorDestination.paste',
          boundDisplayName,
          boundDocumentUri: this.boundDocumentUri.toString(),
          error,
        },
        'Failed to paste to text editor',
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
