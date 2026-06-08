import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { displayName } from '../../../package.json';
import {
  AI_ASSISTANT_PASTE_COMMANDS,
  CLIPBOARD_POST_PASTE_DELAY_MS,
  ENV_RANGELINK_CAPTURE_LOGS,
  FOCUS_TO_PASTE_DELAY_MS,
} from '../../constants';
import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import {
  MessageCode,
  RelativePathFormat,
  type ResolveWorkspacePathResult,
  TerminalFocusType,
} from '../../types';
import {
  formatMessage,
  getUntitledDisplayName,
  resolveWorkspacePath,
  validateTerminalDefined,
} from '../../utils';
import type { ClipboardProvider } from '../ClipboardProvider';
import type { ConfigurationProvider } from '../ConfigurationProvider';
import type { ErrorFeedbackProvider } from '../ErrorFeedbackProvider';
import type { MessageProvider } from '../MessageProvider';
import type { QuickPickProvider } from '../QuickPickProvider';
import type { TerminalPasteAdapter } from '../TerminalPasteAdapter';

/**
 * Default timeout for status bar messages in milliseconds.
 */
const DEFAULT_STATUS_BAR_TIMEOUT_MS = 2000;
const STATUS_BAR_PREFIX = `${displayName}: `;
const STATUS_BAR_SUCCESS_PREFIX = `✓ ${STATUS_BAR_PREFIX}`;

const getUnknownFilename = (): string => formatMessage(MessageCode.UNKNOWN_FILENAME_FALLBACK);

/**
 * Captured once at module load so the prod path of `showQuickPick`'s items
 * projection pays a single `process.env` read. Matches `LogCapture`'s
 * import-time-read pattern; toggling the env var mid-run is not supported
 * (the integration-test runner sets it before spawning VS Code).
 */
const isLogCaptureEnabled = process.env[ENV_RANGELINK_CAPTURE_LOGS] === 'true';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Test-only projection: pull the status fields integration tests destructure
 * out of a picker item, sourced from `terminalInfo` / `fileInfo`. Returns
 * a partial object so it can be spread into the base log entry.
 *
 * Production callers should never need this — gated by
 * `ENV_RANGELINK_CAPTURE_LOGS` at the call site in `showQuickPick`.
 *
 * Exported for direct unit testing; not part of the adapter's public API.
 */
export const projectTestStatusFields = (
  record: Record<string, unknown>,
): { isActive?: boolean; boundState?: string } => {
  const fields: { isActive?: boolean; boundState?: string } = {};
  const terminalInfo = isObject(record.terminalInfo) ? record.terminalInfo : undefined;
  const fileInfo = isObject(record.fileInfo) ? record.fileInfo : undefined;
  if (terminalInfo !== undefined) {
    if (typeof terminalInfo.isActive === 'boolean') fields.isActive = terminalInfo.isActive;
    if (typeof terminalInfo.boundState === 'string') fields.boundState = terminalInfo.boundState;
  } else if (fileInfo !== undefined) {
    if (typeof fileInfo.boundState === 'string') fields.boundState = fileInfo.boundState;
  }
  return fields;
};

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
export class VscodeAdapter
  implements
    ClipboardProvider,
    ConfigurationProvider,
    ErrorFeedbackProvider,
    QuickPickProvider,
    MessageProvider,
    TerminalPasteAdapter
{
  /**
   * Create a new VSCode adapter.
   *
   * @param ideInstance - The vscode module instance to use for all operations
   * @param logger - Logger instance for debug logging of API calls
   */
  constructor(
    private readonly ideInstance: typeof vscode,
    private readonly logger: Logger,
  ) {}

  /**
   * Read text from clipboard using VSCode API.
   *
   * Prefer {@link ClipboardService} for logging and error handling.
   * Direct calls are only appropriate inside ClipboardService itself.
   */
  async readTextFromClipboard(): Promise<string> {
    return this.ideInstance.env.clipboard.readText();
  }

  /**
   * Write text to clipboard using VSCode API.
   *
   * Prefer {@link ClipboardService} for logging and error handling.
   * Direct calls are only appropriate inside ClipboardService itself.
   */
  async writeTextToClipboard(text: string): Promise<void> {
    this.logger.debug(
      { fn: 'VscodeAdapter.writeTextToClipboard', textLength: text.length },
      'Writing to clipboard',
    );
    return this.ideInstance.env.clipboard.writeText(text);
  }

  /**
   * Dispatch a clipboard paste into an AI assistant chat surface (Claude Code,
   * Cursor AI, GitHub Copilot Chat, custom AI Tier 1/2 webview targets).
   *
   * Waits FOCUS_TO_PASTE_DELAY_MS before dispatching so the clipboard write
   * performed earlier by ClipboardRouter has time to propagate across the
   * Electron IPC boundary to the webview's renderer process. Without this
   * delay, webview-based AI assistants read stale clipboard data and the
   * paste lands empty.
   *
   * Iterates over AI_ASSISTANT_PASTE_COMMANDS in order, trying each until one
   * succeeds. The `command` field in the success log identifies which dispatch
   * worked — tests rely on this attribute to assert correct fallback behavior.
   *
   * After the successful paste, waits for postPasteDelayMs so the webview can
   * complete its async clipboard read across the Electron IPC boundary.
   *
   * Not a generic clipboard-paste facade: the iteration and delays are tuned
   * for AI assistant webview surfaces. Use a different code path for terminal
   * or editor paste.
   *
   * @param postPasteDelayMs - Optional delay after paste (defaults to CLIPBOARD_POST_PASTE_DELAY_MS)
   * @returns true if any paste command succeeded, false if all failed
   */
  async pasteClipboardToAiAssistant(postPasteDelayMs?: number): Promise<boolean> {
    const postDelay = postPasteDelayMs ?? CLIPBOARD_POST_PASTE_DELAY_MS;
    const logCtx = {
      fn: 'VscodeAdapter.pasteClipboardToAiAssistant',
      delay: postDelay,
      prePasteDelay: FOCUS_TO_PASTE_DELAY_MS,
    };
    await this.delay(FOCUS_TO_PASTE_DELAY_MS);
    this.logger.debug(logCtx, 'Pre-paste delay complete, trying paste commands');

    for (const command of AI_ASSISTANT_PASTE_COMMANDS) {
      try {
        await this.ideInstance.commands.executeCommand(command);
        this.logger.info({ ...logCtx, command }, 'Clipboard paste succeeded');
        await this.delay(postDelay);
        return true;
      } catch (error) {
        this.logger.debug({ ...logCtx, command, error }, 'Paste command failed, trying next');
      }
    }

    this.logger.warn({ ...logCtx, allCommandsFailed: true }, 'All paste commands failed');
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Show temporary status bar message prefixed with "RangeLink: ".
   */
  setStatusBarMessage(
    message: string,
    timeout: number = DEFAULT_STATUS_BAR_TIMEOUT_MS,
  ): vscode.Disposable {
    return this.setStatusBarMessageInternal(
      `${STATUS_BAR_PREFIX}${message}`,
      timeout,
      'VscodeAdapter.setStatusBarMessage',
    );
  }

  /**
   * Show temporary success status bar message prefixed with "✓ RangeLink: ".
   */
  setSuccessfulStatusBarMessage(
    message: string,
    timeout: number = DEFAULT_STATUS_BAR_TIMEOUT_MS,
  ): vscode.Disposable {
    return this.setStatusBarMessageInternal(
      `${STATUS_BAR_SUCCESS_PREFIX}${message}`,
      timeout,
      'VscodeAdapter.setSuccessfulStatusBarMessage',
    );
  }

  private setStatusBarMessageInternal(
    message: string,
    timeout: number,
    fn: string,
  ): vscode.Disposable {
    this.logger.debug({ fn, message, timeout }, 'Setting status bar message');
    return this.ideInstance.window.setStatusBarMessage(message, timeout);
  }

  /**
   * Show warning notification using VSCode API
   *
   * @param message - Message to display
   * @param items - Optional action button labels
   * @returns Promise resolving to selected button label, or undefined if dismissed
   */
  async showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
    this.logger.debug(
      { fn: 'VscodeAdapter.showWarningMessage', message, items },
      'Showing warning message',
    );
    return this.ideInstance.window.showWarningMessage(message, ...items);
  }

  /**
   * Show error notification using VSCode API
   */
  async showErrorMessage(message: string): Promise<string | undefined> {
    this.logger.debug({ fn: 'VscodeAdapter.showErrorMessage', message }, 'Showing error message');
    return this.ideInstance.window.showErrorMessage(message);
  }

  /**
   * Show information notification using VSCode API
   *
   * @param message - Message to display
   * @param items - Optional action button labels
   * @returns Promise resolving to selected button label, or undefined if dismissed
   */
  async showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
    this.logger.debug(
      { fn: 'VscodeAdapter.showInformationMessage', message, items },
      'Showing info message',
    );
    return this.ideInstance.window.showInformationMessage(message, ...items);
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
    this.logger.debug(
      {
        fn: 'VscodeAdapter.showQuickPick',
        itemCount: items.length,
        options,
        items: items.map((item) => {
          const record = item as Record<string, unknown>;
          const base = {
            label: item.label,
            ...(item.description !== undefined ? { description: item.description } : {}),
            ...(item.detail !== undefined ? { detail: item.detail } : {}),
            ...(item.kind !== undefined ? { kind: item.kind } : {}),
            ...('itemKind' in item ? { itemKind: record.itemKind } : {}),
            ...('displayName' in item ? { displayName: record.displayName } : {}),
            ...('remainingCount' in item ? { remainingCount: record.remainingCount } : {}),
            ...('command' in item ? { command: record.command } : {}),
          };
          return isLogCaptureEnabled ? { ...base, ...projectTestStatusFields(record) } : base;
        }),
      },
      'Showing quick pick',
    );
    return this.ideInstance.window.showQuickPick(items, options);
  }

  /**
   * Create a QuickPick instance for advanced usage (buttons, multiple selection, etc.)
   *
   * @returns A new QuickPick instance that must be shown and disposed by the caller
   */
  createQuickPick<T extends vscode.QuickPickItem>(): vscode.QuickPick<T> {
    return this.ideInstance.window.createQuickPick<T>();
  }

  /**
   * Show an input box to get user input
   *
   * @param options - Configuration for the input box
   * @returns Promise resolving to the entered string, or undefined if cancelled
   */
  async showInputBox(options?: vscode.InputBoxOptions): Promise<string | undefined> {
    this.logger.debug({ fn: 'VscodeAdapter.showInputBox', options }, 'Showing input box');
    return this.ideInstance.window.showInputBox(options);
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
  // Terminal Operations
  // ============================================================================

  /**
   * Show terminal in UI with specified focus behavior.
   *
   * Wrapper for terminal.show() to isolate destination classes from direct vscode calls.
   *
   * Architecture note: Uses enum parameter instead of boolean for extensibility.
   * Additional focus types can be added later without breaking existing code.
   */
  showTerminal(
    terminal: vscode.Terminal,
    focusType: TerminalFocusType,
  ): Result<void, RangeLinkExtensionError> {
    const logCtx: LoggingContext = {
      fn: 'VscodeAdapter.showTerminal',
      terminalName: terminal?.name,
      focusType,
    };

    const validationResult = validateTerminalDefined(terminal);
    if (!validationResult.success) {
      this.logger.error({ ...logCtx, error: validationResult.error }, 'Terminal validation failed');
      return validationResult as unknown as Result<void, RangeLinkExtensionError>;
    }

    switch (focusType) {
      case TerminalFocusType.StealFocus:
        terminal.show(false); // false = don't preserve focus, steal it to terminal
        this.logger.debug(logCtx, 'Showing terminal');
        return Result.ok(undefined);
      default:
        this.logger.error(logCtx, `Unknown focus type: ${focusType}`);
        return Result.err(
          new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.UNKNOWN_FOCUS_TYPE,
            message: `Unknown focus type: ${focusType}`,
            functionName: 'VscodeAdapter.showTerminal',
            details: { focusType: focusType as never },
          }),
        );
    }
  }

  /**
   * Get terminal name for display/logging.
   *
   * Wrapper for terminal.name property access to isolate destination classes.
   */
  getTerminalName(terminal: vscode.Terminal): Result<string, RangeLinkExtensionError> {
    const validationResult = validateTerminalDefined(terminal);
    if (!validationResult.success) {
      this.logger.error(
        { fn: 'VscodeAdapter.getTerminalName', error: validationResult.error },
        'Terminal validation failed',
      );
      return validationResult as unknown as Result<string, RangeLinkExtensionError>;
    }
    return Result.ok(terminal.name);
  }

  // ============================================================================
  // Text Editor Operations
  // ============================================================================

  /**
   * Insert text at cursor position in editor.
   *
   * Wrapper for editor.edit() API to isolate destination classes from direct vscode calls.
   *
   * @param editor - Editor to insert text into
   * @param text - Text to insert
   * @returns Promise resolving to true if edit succeeded, false otherwise
   */
  async insertTextAtCursor(editor: vscode.TextEditor, text: string): Promise<boolean> {
    this.logger.debug(
      {
        fn: 'VscodeAdapter.insertTextAtCursor',
        textLength: text.length,
        editorUri: editor.document.uri.toString(),
      },
      'Inserting text at cursor',
    );
    const success = await editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, text);
    });
    if (!success) {
      this.logger.warn(
        { fn: 'VscodeAdapter.insertTextAtCursor', editorUri: editor.document.uri.toString() },
        'Editor edit failed',
      );
    }
    return success;
  }

  /**
   * Get document URI from editor.
   *
   * Wrapper for editor.document.uri property access to isolate destination classes.
   *
   * @param editor - Editor to get document URI from
   * @returns Document URI
   */
  getDocumentUri(editor: vscode.TextEditor): vscode.Uri {
    return editor.document.uri;
  }

  /**
   * Get document URI scheme from editor.
   *
   * Convenience method for accessing the scheme portion of editor.document.uri.
   * Common schemes: 'file' (regular files), 'untitled' (new unsaved), 'git' (diff views).
   *
   * @param editor - Editor to get document scheme from
   * @returns URI scheme string
   */
  getDocumentScheme(editor: vscode.TextEditor): string {
    return editor.document.uri.scheme;
  }

  /**
   * Extract filename from a URI's file system path.
   *
   * Handles both Unix (/) and Windows (\) path separators regardless of platform.
   *
   * @param uri - URI to extract filename from
   * @returns Filename portion of the path, or 'Unknown' if extraction fails
   */
  getFilenameFromUri(uri: vscode.Uri): string {
    const fsPath = uri?.fsPath;
    if (!fsPath) {
      return getUnknownFilename();
    }
    const lastSeparatorIndex = Math.max(fsPath.lastIndexOf('/'), fsPath.lastIndexOf('\\'));
    const filename = lastSeparatorIndex >= 0 ? fsPath.slice(lastSeparatorIndex + 1) : fsPath;
    return filename || getUnknownFilename();
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
  get extensions(): readonly vscode.Extension<unknown>[] {
    return this.ideInstance.extensions.all || [];
  }

  /**
   * Get a specific extension by ID.
   *
   * More reliable than searching through extensions.all, especially in VSCode forks.
   *
   * @param extensionId - Extension identifier (e.g., 'anthropic.claude-code')
   * @returns Extension instance or undefined if not found
   */
  getExtension(extensionId: string): vscode.Extension<unknown> | undefined {
    return this.ideInstance.extensions.getExtension(extensionId);
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
  async executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T | undefined> {
    this.logger.debug({ fn: 'VscodeAdapter.executeCommand', command, args }, 'Executing command');
    return this.ideInstance.commands.executeCommand<T>(command, ...args);
  }

  /**
   * Get all available commands in VSCode.
   *
   * Used for feature detection (e.g., checking if chat commands exist).
   *
   * @param filterInternal - If true, filters out internal commands (default: false)
   * @returns Promise resolving to array of command identifiers
   */
  async getCommands(filterInternal = false): Promise<string[]> {
    return (await this.ideInstance.commands.getCommands(filterInternal)) || [];
  }

  /**
   * Open a URI in the system's default application (browser, file manager, etc.).
   *
   * @param uri - URI string to open externally
   * @returns Promise resolving to true if the URI was opened successfully
   */
  async openExternal(uri: string): Promise<boolean> {
    this.logger.debug({ fn: 'VscodeAdapter.openExternal', uri }, 'Opening external URI');
    return this.ideInstance.env.openExternal(this.ideInstance.Uri.parse(uri, true));
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
   * @returns ResolvedPath if found, 'filename-ambiguous' if multiple matches, undefined if not found
   */
  async resolveWorkspacePath(linkPath: string): Promise<ResolveWorkspacePathResult> {
    return resolveWorkspacePath(linkPath, this.ideInstance);
  }

  /**
   * Find open untitled file by display name
   *
   * Searches through all open text documents with untitled scheme to find
   * a match for the given display name (e.g., "Untitled-1", "Untitled-2").
   *
   * Useful for navigating to RangeLinks created from unsaved files that are
   * still open in the editor but not yet saved to disk.
   *
   * @param displayName - Display name to search for (e.g., "Untitled-1")
   * @returns URI of matching untitled document, or undefined if not found
   */
  findOpenUntitledFile(displayName: string): vscode.Uri | undefined {
    const openDocuments = this.ideInstance.workspace.textDocuments;
    const untitledDocs = openDocuments.filter((doc) => doc.uri.scheme === 'untitled');

    for (const doc of untitledDocs) {
      const docDisplayName = getUntitledDisplayName(doc.uri);
      if (docDisplayName.toLowerCase() === displayName.toLowerCase()) {
        return doc.uri;
      }
    }

    return undefined;
  }

  /**
   * Find an open document by URI.
   *
   * Searches workspace.textDocuments for a document whose URI matches.
   * Returns undefined if the file is not open (e.g., Explorer context-menu
   * invocation on a closed file).
   */
  findOpenDocument(uri: vscode.Uri): vscode.TextDocument | undefined {
    return this.ideInstance.workspace.textDocuments.find(
      (doc) => doc.uri.toString() === uri.toString(),
    );
  }

  // ============================================================================
  // Extension Lifecycle Operations
  // ============================================================================

  /**
   * Create output channel for extension logging.
   *
   * @param name - Name of the output channel
   * @returns Output channel instance for writing log messages
   */
  createOutputChannel(name: string): vscode.OutputChannel {
    return this.ideInstance.window.createOutputChannel(name);
  }

  /**
   * Create a status bar item.
   *
   * @param alignment - Alignment in status bar (Left or Right)
   * @param priority - Priority determines position relative to other items (higher = more left)
   * @returns StatusBarItem instance
   */
  createStatusBarItem(
    alignment: vscode.StatusBarAlignment,
    priority?: number,
  ): vscode.StatusBarItem {
    return this.ideInstance.window.createStatusBarItem(alignment, priority);
  }

  /**
   * Get IDE language/locale setting.
   *
   * @returns Language code (e.g., 'en', 'fr', 'ja')
   */
  get language(): string {
    return this.ideInstance.env.language;
  }

  /**
   * Get workspace configuration for extension settings.
   *
   * @param section - Configuration section name
   * @returns Configuration object for reading settings
   */
  getConfiguration(section: string): vscode.WorkspaceConfiguration {
    return this.ideInstance.workspace.getConfiguration(section);
  }

  // ============================================================================
  // Registration Operations
  // ============================================================================

  /**
   * Register terminal link provider for clickable links in terminal.
   *
   * @param provider - Terminal link provider instance
   * @returns Disposable to unregister the provider
   */
  registerTerminalLinkProvider<T extends vscode.TerminalLink>(
    provider: vscode.TerminalLinkProvider<T>,
  ): vscode.Disposable {
    return this.ideInstance.window.registerTerminalLinkProvider(provider);
  }

  /**
   * Register document link provider for clickable links in text editors.
   *
   * @param selector - Document selector (schemes, languages, patterns)
   * @param provider - Document link provider instance
   * @returns Disposable to unregister the provider
   */
  registerDocumentLinkProvider(
    selector: vscode.DocumentSelector,
    provider: vscode.DocumentLinkProvider,
  ): vscode.Disposable {
    return this.ideInstance.languages.registerDocumentLinkProvider(selector, provider);
  }

  /**
   * Register command with VSCode command palette.
   *
   * @param command - Command identifier (e.g., 'rangelink.copyLink')
   * @param callback - Command handler function
   * @returns Disposable to unregister the command
   */
  registerCommand(command: string, callback: (...args: unknown[]) => unknown): vscode.Disposable {
    return this.ideInstance.commands.registerCommand(command, callback);
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

  // ============================================================================
  // Event Listeners
  // ============================================================================

  /**
   * Register event listener for terminal opening.
   *
   * @param listener - Callback invoked when a terminal is opened
   * @returns Disposable to unregister the listener
   */
  onDidOpenTerminal(listener: (terminal: vscode.Terminal) => void): vscode.Disposable {
    return this.ideInstance.window.onDidOpenTerminal(listener);
  }

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
   * Register event listener for active-terminal changes.
   *
   * @param listener - Callback invoked when the active terminal changes
   * @returns Disposable to unregister the listener
   */
  onDidChangeActiveTerminal(
    listener: (terminal: vscode.Terminal | undefined) => void,
  ): vscode.Disposable {
    return this.ideInstance.window.onDidChangeActiveTerminal(listener);
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

  /**
   * Register event listener for configuration changes.
   *
   * @param listener - Callback invoked when any configuration changes
   * @returns Disposable to unregister the listener
   */
  onDidChangeConfiguration(
    listener: (event: vscode.ConfigurationChangeEvent) => void,
  ): vscode.Disposable {
    return this.ideInstance.workspace.onDidChangeConfiguration(listener);
  }

  /**
   * Register event listener for tab changes across all tab groups.
   *
   * @param listener - Callback invoked when tabs are opened, closed, or changed
   * @returns Disposable to unregister the listener
   */
  onDidChangeTabs(listener: (event: vscode.TabChangeEvent) => void): vscode.Disposable {
    return this.ideInstance.window.tabGroups.onDidChangeTabs(listener);
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
   * Get all open terminals.
   *
   * @returns Readonly array of all terminal instances
   */
  get terminals(): readonly vscode.Terminal[] {
    return this.ideInstance.window.terminals || [];
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
   * Get the URI of the currently active text editor's document.
   *
   * Convenience method for accessing the active document's URI without
   * needing to check for undefined at each step.
   *
   * @returns URI of active document or undefined if no editor is active
   */
  getActiveTextEditorUri(): vscode.Uri | undefined {
    this.logger.debug(
      { fn: 'VscodeAdapter.getActiveTextEditorUri' },
      'Getting active text editor URI',
    );
    return this.activeTextEditor?.document.uri;
  }

  /**
   * Get the view column of the currently active text editor.
   *
   * @returns ViewColumn of active editor or undefined if no editor is active
   */
  getActiveEditorViewColumn(): vscode.ViewColumn | undefined {
    return this.activeTextEditor?.viewColumn;
  }

  /**
   * Get all visible text editors.
   *
   * @returns Array of visible text editors
   */
  get visibleTextEditors(): readonly vscode.TextEditor[] {
    return this.ideInstance.window.visibleTextEditors || [];
  }

  /**
   * Find visible text editors whose document matches the given URI.
   *
   * @param uri - Document URI to match against
   * @returns Array of matching visible editors (0, 1, or more)
   */
  findVisibleEditorsByUri(uri: vscode.Uri): readonly vscode.TextEditor[] {
    const uriString = uri.toString();
    return this.visibleTextEditors.filter((editor) => editor.document.uri.toString() === uriString);
  }

  /**
   * Check if a visible editor exists at the given URI and viewColumn.
   */
  hasVisibleEditorAt(uri: vscode.Uri, viewColumn: number): boolean {
    const uriString = uri.toString();
    return this.visibleTextEditors.some(
      (editor) => editor.document.uri.toString() === uriString && editor.viewColumn === viewColumn,
    );
  }

  /**
   * Check if a visible editor at the given URI has an active (non-empty) selection.
   *
   * When viewColumn is provided, only considers editors in that column.
   * Editor-only — terminals and AI assistants never have text selections.
   *
   * @param uri - Document URI to match against
   * @param viewColumn - Optional view column to scope the check
   * @returns true if at least one matching visible editor has a non-empty selection
   */
  editorHasActiveSelection(uri: vscode.Uri, viewColumn?: vscode.ViewColumn): boolean {
    const editors = this.findVisibleEditorsByUri(uri);
    const relevantEditors =
      viewColumn !== undefined ? editors.filter((e) => e.viewColumn === viewColumn) : editors;
    return relevantEditors.length > 0 && relevantEditors.some((e) => !e.selection.isEmpty);
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
    return this.findAllTabGroupsForDocument(documentUri)[0];
  }

  /**
   * Find all tab groups that contain a document with the given URI.
   *
   * Unlike findTabGroupForDocument (which returns the first match), this collects
   * every tab group that has a tab for the document — necessary when the same file
   * is hidden in multiple tab groups at different columns.
   *
   * @param documentUri - The document URI to search for
   * @returns All tab groups containing the document (empty array if none found)
   */
  findAllTabGroupsForDocument(documentUri: vscode.Uri): vscode.TabGroup[] {
    const matches: vscode.TabGroup[] = [];
    for (const tabGroup of this.ideInstance.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        const tabUri = this.getTabDocumentUri(tab);
        if (tabUri && tabUri.toString() === documentUri.toString()) {
          matches.push(tabGroup);
          break;
        }
      }
    }
    return matches;
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
   * @param format - RelativePathFormat.PathOnly omits the workspace folder name; RelativePathFormat.WithWorkspaceFolder includes it.
   * @returns Workspace-relative path
   */
  asRelativePath(pathOrUri: string | vscode.Uri, format: RelativePathFormat): string {
    return this.ideInstance.workspace.asRelativePath(
      pathOrUri,
      format === RelativePathFormat.WithWorkspaceFolder,
    );
  }
}
