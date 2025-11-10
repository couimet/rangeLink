import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { DestinationType, PasteDestination } from './PasteDestination';
import { applySmartPadding } from '../utils/applySmartPadding';
import { isEligibleForPaste } from '../utils/isEligibleForPaste';

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

  private boundEditor: vscode.TextEditor | undefined;

  constructor(private readonly logger: Logger) {}

  /**
   * Check if text editor destination is available (has bound editor)
   */
  async isAvailable(): Promise<boolean> {
    return this.boundEditor !== undefined;
  }

  /**
   * Paste text to bound text editor at cursor position with smart padding
   *
   * Validation:
   * - Checks text eligibility (not null/undefined/empty/whitespace-only)
   * - Checks if editor is still valid (not closed)
   * - Logs INFO and returns false if validation fails
   *
   * Smart padding behavior:
   * - Only adds leading space if text doesn't start with whitespace
   * - Only adds trailing space if text doesn't end with whitespace
   * - Consistent with TerminalDestination behavior
   *
   * @param text - The text to paste
   * @returns true if paste succeeded, false if validation failed or no editor bound
   */
  async paste(text: string): Promise<boolean> {
    if (!isEligibleForPaste(text)) {
      this.logger.info({ fn: 'TextEditorDestination.paste', text }, 'Text not eligible for paste');
      return false;
    }

    if (!this.boundEditor) {
      this.logger.warn(
        { fn: 'TextEditorDestination.paste', textLength: text.length },
        'Cannot paste: No text editor bound',
      );
      return false;
    }

    // Check if editor is still valid (not closed)
    if (this.boundEditor.document.isClosed) {
      this.logger.warn(
        { fn: 'TextEditorDestination.paste', editorPath: this.getEditorPath() },
        'Cannot paste: Bound editor was closed',
      );
      return false;
    }

    const editorDisplayName = this.getEditorDisplayName();
    const editorPath = this.getEditorPath();

    try {
      // Apply smart padding for consistency with terminal
      const paddedText = applySmartPadding(text);

      // Insert at cursor position
      const success = await this.boundEditor.edit((editBuilder) => {
        editBuilder.insert(this.boundEditor!.selection.active, paddedText);
      });

      if (!success) {
        this.logger.error(
          {
            fn: 'TextEditorDestination.paste',
            editorDisplayName,
            editorPath,
            textLength: text.length,
          },
          'Edit operation failed',
        );
        return false;
      }

      this.logger.info(
        {
          fn: 'TextEditorDestination.paste',
          editorDisplayName,
          editorPath,
          originalLength: text.length,
          paddedLength: paddedText.length,
        },
        `Pasted to text editor: ${editorDisplayName}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        {
          fn: 'TextEditorDestination.paste',
          editorDisplayName,
          editorPath,
          error,
        },
        'Failed to paste to text editor',
      );
      return false;
    }
  }

  /**
   * Update bound text editor reference
   *
   * Called by PasteDestinationManager when user binds/unbinds text editor.
   * This is external state management - the manager owns the binding logic.
   *
   * @param editor - The editor to bind, or undefined to unbind
   */
  setEditor(editor: vscode.TextEditor | undefined): void {
    this.boundEditor = editor;
    const displayName = editor ? this.getEditorDisplayName() : undefined;
    const path = editor ? this.getEditorPath() : undefined;

    this.logger.debug(
      { fn: 'TextEditorDestination.setEditor', editorDisplayName: displayName, editorPath: path },
      editor ? `Text editor set: ${displayName}` : 'Text editor cleared',
    );
  }

  /**
   * Get bound text editor
   *
   * @returns The bound editor or undefined if none bound
   */
  getEditor(): vscode.TextEditor | undefined {
    return this.boundEditor;
  }

  /**
   * Get user-friendly display name for bound editor (workspace-relative)
   *
   * Returns workspace-relative path for file:// scheme, or "Untitled-N" for untitled files.
   * Used in user-facing status messages and notifications.
   *
   * @returns Workspace-relative path or "Untitled-N", or undefined if no editor bound
   */
  getEditorDisplayName(): string | undefined {
    if (!this.boundEditor) {
      return undefined;
    }

    const document = this.boundEditor.document;

    // Handle untitled files
    if (document.uri.scheme === 'untitled') {
      return document.isUntitled ? `Untitled-${document.uri.path.replace(/^\//, '')}` : 'Untitled';
    }

    // Get workspace-relative path for file:// scheme
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (workspaceFolder) {
      const relativePath = vscode.workspace.asRelativePath(document.uri, false);
      return relativePath;
    }

    // Fallback to filename if not in workspace
    return document.uri.fsPath.split('/').pop() || 'Unknown';
  }

  /**
   * Get absolute path for bound editor (for logging)
   *
   * Returns full absolute path for debugging and log analysis.
   *
   * @returns Absolute path, or undefined if no editor bound
   */
  getEditorPath(): string | undefined {
    if (!this.boundEditor) {
      return undefined;
    }

    return this.boundEditor.document.uri.toString();
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
