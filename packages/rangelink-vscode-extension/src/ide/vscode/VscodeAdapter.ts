import * as vscode from 'vscode';

import { resolveWorkspacePath } from '../../utils/resolveWorkspacePath';

/**
 * Default timeout for status bar messages in milliseconds.
 */
const DEFAULT_STATUS_BAR_TIMEOUT_MS = 2000;

/**
 * VSCode adapter for IDE-specific operations.
 *
 * Complete facade around VSCode API providing single entry point for:
 * - Clipboard operations
 * - Status bar messages
 * - User notifications (warning, error, info)
 * - Document/editor operations
 * - Workspace operations (path resolution)
 * - Primitive factories (Position, Selection, Range, DocumentLink)
 * - URI parsing and manipulation
 * - Environment information (appName, uriScheme, extensions)
 * - Command execution
 *
 * Enables testing by abstracting VSCode API calls and avoiding direct
 * vscode module imports in business logic classes.
 */
export class VscodeAdapter {
  /**
   * Create a new VSCode adapter.
   *
   * @param ideInstance - The vscode module instance to use for all operations
   */
  constructor(private readonly ideInstance: typeof vscode) {}

  /**
   * Write text to clipboard using VSCode API
   */
  async writeTextToClipboard(text: string): Promise<void> {
    return this.ideInstance.env.clipboard.writeText(text);
  }

  /**
   * Show temporary status bar message using VSCode API
   */
  setStatusBarMessage(
    message: string,
    timeout: number = DEFAULT_STATUS_BAR_TIMEOUT_MS,
  ): vscode.Disposable {
    return this.ideInstance.window.setStatusBarMessage(message, timeout);
  }

  /**
   * Show warning notification using VSCode API
   */
  async showWarningMessage(message: string): Promise<string | undefined> {
    return this.ideInstance.window.showWarningMessage(message);
  }

  /**
   * Show error notification using VSCode API
   */
  async showErrorMessage(message: string): Promise<string | undefined> {
    return this.ideInstance.window.showErrorMessage(message);
  }

  /**
   * Show information notification using VSCode API
   */
  async showInformationMessage(message: string): Promise<string | undefined> {
    return this.ideInstance.window.showInformationMessage(message);
  }

  /**
   * Show quick pick dialog for user selection
   *
   * @param items - Array of items to choose from
   * @param options - Optional configuration for the quick pick
   * @returns Promise resolving to the selected item, or undefined if cancelled
   */
  async showQuickPick<T extends vscode.QuickPickItem>(
    items: T[],
    options?: vscode.QuickPickOptions,
  ): Promise<T | undefined> {
    return this.ideInstance.window.showQuickPick(items, options);
  }

  /**
   * Open a document and show it in the editor
   *
   * Supports full VSCode API options for fine-grained control:
   * - preserveFocus: Whether to keep current focus or switch to opened editor
   * - preview: Whether to open in preview mode
   * - viewColumn: Which editor column to show the document in
   * - selection: Range to select/highlight in the document
   *
   * @param uri - URI of the document to open
   * @param options - Optional view configuration (preserveFocus, viewColumn, etc.)
   * @returns Promise resolving to the text editor showing the document
   */
  async showTextDocument(
    uri: vscode.Uri,
    options?: vscode.TextDocumentShowOptions,
  ): Promise<vscode.TextEditor> {
    const document = await this.ideInstance.workspace.openTextDocument(uri);
    return this.ideInstance.window.showTextDocument(document, options);
  }

  // ============================================================================
  // Environment Information
  // ============================================================================

  /**
   * Get the application name.
   *
   * Used for IDE detection (e.g., "Visual Studio Code" vs "Cursor").
   *
   * @returns Application name from VSCode environment
   */
  get appName(): string {
    return this.ideInstance.env.appName;
  }

  /**
   * Get the URI scheme for the application.
   *
   * Used for IDE detection (e.g., "vscode" vs "cursor").
   *
   * @returns URI scheme from VSCode environment
   */
  get uriScheme(): string {
    return this.ideInstance.env.uriScheme;
  }

  /**
   * Get all installed extensions.
   *
   * Used for IDE detection via extension IDs.
   *
   * @returns Array of all extensions
   */
  get extensions(): readonly vscode.Extension<any>[] {
    return this.ideInstance.extensions.all;
  }

  // ============================================================================
  // Command Execution
  // ============================================================================

  /**
   * Execute a VSCode command.
   *
   * Wraps vscode.commands.executeCommand for abstraction and testing.
   *
   * @param command - Command identifier to execute
   * @param args - Optional command arguments
   * @returns Promise resolving to command result
   */
  async executeCommand<T = unknown>(command: string, ...args: any[]): Promise<T | undefined> {
    return this.ideInstance.commands.executeCommand<T>(command, ...args);
  }

  // ============================================================================
  // Workspace Operations
  // ============================================================================

  /**
   * Resolve a file path from a RangeLink to an absolute file URI.
   *
   * Delegates to resolveWorkspacePath utility for path resolution logic.
   *
   * @param linkPath - File path from RangeLink (may be relative or absolute)
   * @returns File URI if found, undefined otherwise
   */
  async resolveWorkspacePath(linkPath: string): Promise<vscode.Uri | undefined> {
    return resolveWorkspacePath(linkPath, this.ideInstance);
  }

  // ============================================================================
  // Primitive Factories
  // ============================================================================

  /**
   * Create a Position instance representing a line and character location.
   *
   * @param line - Zero-based line number
   * @param character - Zero-based character offset
   * @returns Position instance
   */
  createPosition(line: number, character: number): vscode.Position {
    return new this.ideInstance.Position(line, character);
  }

  /**
   * Create a Selection instance representing a text selection range.
   *
   * @param anchor - Starting position of the selection
   * @param active - Ending position of the selection
   * @returns Selection instance
   */
  createSelection(anchor: vscode.Position, active: vscode.Position): vscode.Selection {
    return new this.ideInstance.Selection(anchor, active);
  }

  /**
   * Create a Range instance representing a range between two positions.
   *
   * @param start - Starting position of the range
   * @param end - Ending position of the range
   * @returns Range instance
   */
  createRange(start: vscode.Position, end: vscode.Position): vscode.Range {
    return new this.ideInstance.Range(start, end);
  }

  /**
   * Parse a string into a URI.
   *
   * @param value - URI string to parse
   * @returns Parsed URI instance
   */
  parseUri(value: string): vscode.Uri {
    return this.ideInstance.Uri.parse(value);
  }

  /**
   * Create a document link.
   *
   * @param range - The range where the link appears in the document
   * @param target - Optional target URI for the link
   * @returns New DocumentLink instance
   */
  createDocumentLink(range: vscode.Range, target?: vscode.Uri): vscode.DocumentLink {
    return new this.ideInstance.DocumentLink(range, target);
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================

  /**
   * Register event listener for terminal closure.
   *
   * @param listener - Callback invoked when a terminal is closed
   * @returns Disposable to unregister the listener
   */
  onDidCloseTerminal(listener: (terminal: vscode.Terminal) => void): vscode.Disposable {
    return this.ideInstance.window.onDidCloseTerminal(listener);
  }

  /**
   * Register event listener for text document closure.
   *
   * @param listener - Callback invoked when a text document is closed
   * @returns Disposable to unregister the listener
   */
  onDidCloseTextDocument(listener: (document: vscode.TextDocument) => void): vscode.Disposable {
    return this.ideInstance.workspace.onDidCloseTextDocument(listener);
  }

  // ============================================================================
  // Workspace Getters
  // ============================================================================

  /**
   * Get the currently active terminal.
   *
   * @returns Active terminal or undefined if none is active
   */
  get activeTerminal(): vscode.Terminal | undefined {
    return this.ideInstance.window.activeTerminal;
  }

  /**
   * Get the currently active text editor.
   *
   * @returns Active text editor or undefined if none is active
   */
  get activeTextEditor(): vscode.TextEditor | undefined {
    return this.ideInstance.window.activeTextEditor;
  }

  /**
   * Get all visible text editors.
   *
   * @returns Array of visible text editors
   */
  get visibleTextEditors(): readonly vscode.TextEditor[] {
    return this.ideInstance.window.visibleTextEditors;
  }

  /**
   * Get tab groups API for managing editor tab groups.
   *
   * @returns Tab groups API
   */
  get tabGroups(): vscode.TabGroups {
    return this.ideInstance.window.tabGroups;
  }

  /**
   * Find which tab group contains a document with the given URI.
   *
   * Searches all tab groups for text editor tabs (excludes terminals, webviews, etc.)
   * that match the provided document URI.
   *
   * This method encapsulates VSCode-specific tab group logic and instanceof checks,
   * keeping the abstraction clean for callers.
   *
   * @param documentUri - The document URI to search for
   * @returns The tab group containing the document, or undefined if not found
   */
  findTabGroupForDocument(documentUri: vscode.Uri): vscode.TabGroup | undefined {
    for (const tabGroup of this.ideInstance.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        const tabUri = this.getTabDocumentUri(tab);
        if (tabUri && tabUri.toString() === documentUri.toString()) {
          return tabGroup;
        }
      }
    }
    return undefined;
  }

  /**
   * Check if a tab represents a text editor (not terminal, webview, etc.).
   *
   * Encapsulates the VSCode-specific instanceof check for TabInputText.
   * Uses TypeScript type predicate to narrow tab.input type automatically.
   *
   * @param tab - The tab to check
   * @returns True if the tab is a text editor (type guard narrows tab.input to TabInputText)
   */
  isTextEditorTab(tab: vscode.Tab): tab is vscode.Tab & { input: vscode.TabInputText } {
    return tab.input instanceof this.ideInstance.TabInputText;
  }

  /**
   * Get the document URI from a text editor tab.
   *
   * Returns the URI if the tab is a text editor, undefined otherwise.
   * Combines the type check with URI extraction for convenience.
   *
   * Delegates to isTextEditorTab() for type checking (DRY principle).
   *
   * @param tab - The tab to extract URI from
   * @returns Document URI if tab is a text editor, undefined otherwise
   */
  getTabDocumentUri(tab: vscode.Tab): vscode.Uri | undefined {
    if (this.isTextEditorTab(tab)) {
      return tab.input.uri;
    }
    return undefined;
  }

  // ============================================================================
  // Workspace Methods
  // ============================================================================

  /**
   * Get the workspace folder containing the given URI.
   *
   * @param uri - URI to find the workspace folder for
   * @returns Workspace folder or undefined if URI is not in any workspace
   */
  getWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
    return this.ideInstance.workspace.getWorkspaceFolder(uri);
  }

  /**
   * Convert a path or URI to a workspace-relative path.
   *
   * @param pathOrUri - Absolute path or URI to convert
   * @param includeWorkspaceFolder - Whether to include workspace folder name
   * @returns Workspace-relative path
   */
  asRelativePath(pathOrUri: string | vscode.Uri, includeWorkspaceFolder?: boolean): string {
    return this.ideInstance.workspace.asRelativePath(pathOrUri, includeWorkspaceFolder);
  }
}
