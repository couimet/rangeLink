import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { applySmartPadding } from '../utils/applySmartPadding';
import { formatMessage } from '../utils/formatMessage';
import { isEligibleForPaste } from '../utils/isEligibleForPaste';

import type { DestinationType, PasteDestination } from './PasteDestination';

/**
 * Text Editor destination implementation for pasting RangeLinks
 *
 * Bound to a specific text editor at construction (immutable).
 * Manager uses create-and-discard pattern: creates new instance on bind, discards on unbind.
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

  constructor(
    private readonly editor: vscode.TextEditor,
    private readonly vscodeAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * Get display name for UI (evaluated in real-time)
   *
   * Returns workspace-relative path or filename for display (e.g., "src/file.ts").
   * Evaluated on each access rather than cached to ensure freshness.
   */
  get displayName(): string {
    return this.computeEditorDisplayName();
  }

  /**
   * Get absolute path for logging (evaluated in real-time)
   *
   * Returns full absolute path for debugging and log analysis.
   * Evaluated on each access rather than cached.
   */
  get editorPath(): string {
    return this.editor.document.uri.toString();
  }

  /**
   * Check if text editor destination is available
   *
   * Always returns true since construction implies availability.
   * Manager only creates text editor destinations when editor exists.
   */
  async isAvailable(): Promise<boolean> {
    return true;
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
   * @returns true if eligible, false if self-paste detected
   */
  private checkSelfPasteEligibility(fnName: string, actionDescription: string): boolean {
    // Get active editor (source of link/text creation)
    const activeEditor = this.vscodeAdapter.activeTextEditor;

    // If no active editor, can't be self-paste
    if (!activeEditor) {
      return true;
    }

    // Self-paste detection: Compare active editor's document URI with bound document URI
    const isSelfPaste =
      activeEditor.document.uri.toString() === this.editor.document.uri.toString();

    if (isSelfPaste) {
      this.logger.debug(
        {
          fn: `TextEditorDestination.${fnName}`,
          activeDocumentUri: activeEditor.document.uri.toString(),
          boundDocumentUri: this.editor.document.uri.toString(),
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
    return this.checkSelfPasteEligibility(
      'isEligibleForPasteContent',
      'selecting text FROM bound editor',
    );
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
   * Focus the bound text editor
   *
   * Brings the bound editor document into view without changing cursor position.
   * Used by the "Jump to Bound Destination" command (issue #99).
   *
   * @returns true (always succeeds since editor is guaranteed at construction)
   */
  async focus(): Promise<boolean> {
    const editorDisplayName = this.displayName;

    try {
      // Focus the editor (preserveFocus: false steals focus)
      await this.vscodeAdapter.showTextDocument(this.editor.document.uri, {
        preserveFocus: false,
        viewColumn: this.editor.viewColumn,
      });

      this.logger.info(
        {
          fn: 'TextEditorDestination.focus',
          editorDisplayName,
          editorPath: this.editorPath,
        },
        `Focused text editor: ${editorDisplayName}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        {
          fn: 'TextEditorDestination.focus',
          editorDisplayName,
          editorPath: this.editorPath,
          error,
        },
        'Failed to focus text editor',
      );
      return false;
    }
  }

  /**
   * Validate that editor is ready for paste operation
   *
   * Checks if bound document is the active (topmost) tab in its tab group.
   * Returns editor and display name if validation passes.
   *
   * @param logContext - Logging context for error messages
   * @returns Editor and display name if validation passes, undefined otherwise
   */
  private validateEditorForPaste(
    logContext: LoggingContext,
  ): { editor: vscode.TextEditor; editorDisplayName: string } | undefined {
    const editorDisplayName = this.displayName;

    // Find which tab group contains the bound document
    const boundTabGroup = this.vscodeAdapter.findTabGroupForDocument(this.editor.document.uri);

    if (!boundTabGroup) {
      this.logger.error(
        {
          ...logContext,
          boundDocumentUri: this.editor.document.uri.toString(),
          editorDisplayName,
        },
        'Bound document not found in any tab group - likely closed',
      );
      return undefined;
    }

    // Check if bound document is the active (topmost) tab
    const activeTab = boundTabGroup.activeTab;

    if (!activeTab) {
      this.logger.warn({ ...logContext, editorDisplayName }, 'Tab group has no active tab');
      return undefined;
    }

    if (!this.vscodeAdapter.isTextEditorTab(activeTab)) {
      this.logger.warn(
        {
          ...logContext,
          editorDisplayName,
          tabInputType: typeof activeTab.input,
        },
        'Active tab is not a text editor',
      );
      return undefined;
    }

    if (activeTab.input.uri.toString() !== this.editor.document.uri.toString()) {
      // Bound document exists but is not topmost - show warning but keep binding
      this.logger.warn(
        {
          ...logContext,
          boundDocumentUri: this.editor.document.uri.toString(),
          activeTabUri: activeTab.input.uri.toString(),
          editorDisplayName,
        },
        'Bound document is not topmost in its tab group',
      );
      return undefined;
    }

    return { editor: this.editor, editorDisplayName };
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
    return this.insertTextAtCursor({
      text: formattedLink.link,
      logContext: {
        fn: 'TextEditorDestination.pasteLink',
        formattedLink,
        linkLength: formattedLink.link.length,
      },
      ineligibleMessage: 'Link not eligible for paste',
      successLogMessage: (boundDisplayName: string) =>
        `Pasted link to text editor: ${boundDisplayName}`,
      errorMessage: 'Failed to paste link to text editor',
    });
  }

  /**
   * Insert text at cursor position in bound text editor with smart padding and focus
   *
   * Shared helper for pasteLink() and pasteContent() to eliminate duplication.
   * Handles all validation, padding, insertion, focus, and logging.
   *
   * @param options - Configuration for text insertion
   * @returns true if paste succeeded, false if validation failed or cannot paste
   */
  private async insertTextAtCursor(options: {
    text: string;
    logContext: LoggingContext;
    ineligibleMessage: string;
    successLogMessage: (editorDisplayName: string) => string;
    errorMessage: string;
  }): Promise<boolean> {
    const { text, logContext, ineligibleMessage, successLogMessage, errorMessage } = options;

    if (!isEligibleForPaste(text)) {
      this.logger.info(logContext, ineligibleMessage);
      return false;
    }

    // Validate editor is ready for paste (checks if topmost tab)
    const validation = this.validateEditorForPaste(logContext);
    if (!validation) {
      return false;
    }

    const { editor, editorDisplayName } = validation;

    // All validations passed - perform the paste
    try {
      const paddedText = applySmartPadding(text);

      const success = await this.vscodeAdapter.insertTextAtCursor(editor, paddedText);

      if (!success) {
        // Build error log context - spread logContext to preserve all fields, add edit-specific info
        const editFailedContext: LoggingContext = {
          ...logContext,
          editorDisplayName,
          editorPath: this.editorPath,
        };

        // Add length field based on what's being pasted
        if ('formattedLink' in logContext) {
          editFailedContext.linkLength = text.length;
        } else {
          editFailedContext.contentLength = text.length;
        }

        this.logger.error(editFailedContext, 'Edit operation failed');
        return false;
      }

      // Focus the editor (similar to terminal.show(false) behavior)
      await this.vscodeAdapter.showTextDocument(editor.document.uri, {
        preserveFocus: false, // Steal focus to bring user to paste destination
        viewColumn: editor.viewColumn, // Keep in same tab group
      });

      // Build success log context - spread logContext to preserve all fields
      const successContext: LoggingContext = {
        ...logContext,
        editorDisplayName,
        editorPath: this.editorPath,
        originalLength: text.length,
        paddedLength: paddedText.length,
      };

      this.logger.info(successContext, successLogMessage(editorDisplayName));

      return true;
    } catch (error) {
      // Build exception log context - spread logContext to preserve all fields
      const exceptionContext: LoggingContext = {
        ...logContext,
        editorDisplayName,
        editorPath: this.editorPath,
        error,
      };

      this.logger.error(exceptionContext, errorMessage);
      return false;
    }
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
    return this.insertTextAtCursor({
      text: content,
      logContext: { fn: 'TextEditorDestination.pasteContent', contentLength: content.length },
      ineligibleMessage: 'Content not eligible for paste',
      successLogMessage: (editorDisplayName: string) =>
        `Pasted content to text editor: ${editorDisplayName}`,
      errorMessage: 'Exception during paste operation',
    });
  }

  /**
   * Get bound document URI
   *
   * Used by PasteDestinationManager for document close detection.
   *
   * @returns The bound document URI
   */
  getBoundDocumentUri(): vscode.Uri {
    return this.editor.document.uri;
  }

  /**
   * Compute user-friendly display name for bound document (workspace-relative)
   *
   * Returns workspace-relative path for file:// scheme, or "Untitled-N" for untitled files.
   * Called at construction to cache display name.
   *
   * @returns Workspace-relative path or "Untitled-N"
   */
  private computeEditorDisplayName(): string {
    const uri = this.editor.document.uri;

    // Handle untitled files
    if (uri.scheme === 'untitled') {
      return `Untitled-${uri.path.replace(/^\//, '')}`;
    }

    // Get workspace-relative path for file:// scheme
    const workspaceFolder = this.vscodeAdapter.getWorkspaceFolder(uri);
    if (workspaceFolder) {
      const relativePath = this.vscodeAdapter.asRelativePath(uri, false);
      return relativePath;
    }

    // Fallback to filename if not in workspace
    return uri.fsPath.split('/').pop() || 'Unknown';
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

  /**
   * Get success message for jump command
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    return formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_EDITOR, {
      editorDisplayName: this.displayName,
    });
  }

  /**
   * Get destination-specific details for logging
   *
   * @returns Editor display name and path for logging context
   */
  getLoggingDetails(): Record<string, unknown> {
    return {
      editorDisplayName: this.displayName,
      editorPath: this.editorPath,
    };
  }

  /**
   * Check if this text editor equals another destination
   *
   * @param other - The destination to compare against (may be undefined)
   * @returns Promise<true> if same editor document, Promise<false> otherwise
   */
  async equals(other: PasteDestination | undefined): Promise<boolean> {
    // Safeguard 1: Check other is defined
    if (!other) {
      return false;
    }

    // Safeguard 2: Check type matches
    if (other.id !== 'text-editor') {
      return false;
    }

    // Safeguard 3: Check other has editor resource (type assertion - Option B)
    const otherAsEditor = other as TextEditorDestination;
    const otherEditor = otherAsEditor.editor;
    if (!otherEditor?.document?.uri) {
      // Should never happen if construction is correct, but be defensive
      this.logger.warn(
        { fn: 'TextEditorDestination.equals' },
        'Other editor destination missing editor/document/uri',
      );
      return false;
    }

    // Compare document URIs (unique per file)
    return this.editor.document.uri.toString() === otherEditor.document.uri.toString();
  }
}
