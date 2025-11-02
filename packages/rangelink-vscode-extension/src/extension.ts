import {
  DEFAULT_DELIMITERS,
  DelimiterConfig,
  DelimiterValidationError,
  FormatOptions,
  HashMode,
  PathFormat,
  RESERVED_CHARS,
  RangeFormat,
  RangeLinkMessageCode,
  Selection,
  areDelimitersUnique,
  formatLink,
  formatPortableLink,
  haveSubstringConflicts,
  setLogger,
  validateDelimiter,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';


import { VSCodeLogger } from './VSCodeLogger';

// Re-export PathFormat for backward compatibility with tests
export { PathFormat, DelimiterValidationError, RangeLinkMessageCode };

/**
 * VSCode-specific link interface (kept for extension API)
 */
export interface Link {
  path: string;
  startLine: number;
  endLine: number;
  startPosition?: number;
  endPosition?: number;
  isAbsolute: boolean;
}

/**
 * Adapter: Converts VSCode Selection to core Selection interface
 */
function toCoreSelections(vscodeSelections: readonly vscode.Selection[]): Selection[] {
  return vscodeSelections.map((sel) => ({
    startLine: sel.start.line,
    startCharacter: sel.start.character,
    endLine: sel.end.line,
    endCharacter: sel.end.character,
  }));
}

/**
 * RangeLinkService: VSCode-specific orchestration layer
 * Core logic is handled by rangelink-core-ts functions
 */
export class RangeLinkService {
  private delimiters: DelimiterConfig;

  constructor(delimiters: DelimiterConfig) {
    this.delimiters = delimiters;
  }

  /**
   * Creates a standard RangeLink from the current editor selection
   */
  async createLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    if (!selections || selections.length === 0 || selections.every((s) => s.isEmpty)) {
      throw new Error('RangeLink command invoked with empty selection');
    }

    const referencePath = this.getReferencePath(document, pathFormat);
    const coreSelections = toCoreSelections(selections);

    // Determine if this is a full-line selection (only for single selection)
    const options: FormatOptions = {
      isFullLine: selections.length === 1 ? this.isFullLineSelection(editor, selections[0]) : false,
    };

    const result = formatLink(referencePath, coreSelections, this.delimiters, options);

    if (!result.success) {
      vscode.window.showErrorMessage(`Failed to format link: ${result.error}`);
      return;
    }

    await vscode.env.clipboard.writeText(result.value);
    vscode.window.setStatusBarMessage(`✓ RangeLink copied to clipboard`, 2000);
  }

  /**
   * Creates a portable RangeLink with embedded delimiter metadata
   */
  async createPortableLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    const selections = editor.selections;

    if (!selections || selections.length === 0 || selections.every((s) => s.isEmpty)) {
      throw new Error('RangeLink command invoked with empty selection');
    }

    const referencePath = this.getReferencePath(document, pathFormat);
    const coreSelections = toCoreSelections(selections);

    // Determine if this is a full-line selection (only for single selection)
    const options: FormatOptions = {
      isFullLine: selections.length === 1 ? this.isFullLineSelection(editor, selections[0]) : false,
    };

    const result = formatPortableLink(referencePath, coreSelections, this.delimiters, options);

    if (!result.success) {
      vscode.window.showErrorMessage(`Failed to format portable link: ${result.error}`);
      return;
    }

    await vscode.env.clipboard.writeText(result.value);
    vscode.window.setStatusBarMessage(`✓ Portable RangeLink copied to clipboard`, 2000);
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

  /**
   * Determines if a selection represents a full-line selection
   */
  private isFullLineSelection(editor: vscode.TextEditor, selection: vscode.Selection): boolean {
    const startLine = editor.document.lineAt(selection.start.line);
    const endLine = editor.document.lineAt(selection.end.line);

    const startsAtBeginning = selection.start.character === 0;
    const endsAtEndOfLine =
      selection.end.character === endLine.range.end.character ||
      selection.end.character >= endLine.text.length || // Selection extends beyond line content
      (selection.end.line > selection.start.line && selection.end.character === 0);

    return startsAtBeginning && endsAtEndOfLine;
  }
}

// ============================================================================
// Configuration & Validation
// ============================================================================

/**
 * Maps DelimiterValidationError to RangeLinkMessageCode
 */
export function getErrorCodeForTesting(error: DelimiterValidationError): RangeLinkMessageCode {
  switch (error) {
    case DelimiterValidationError.None:
      return RangeLinkMessageCode.CONFIG_LOADED;
    case DelimiterValidationError.Empty:
      return RangeLinkMessageCode.CONFIG_ERR_DELIMITER_EMPTY;
    case DelimiterValidationError.ContainsDigits:
      return RangeLinkMessageCode.CONFIG_ERR_DELIMITER_DIGITS;
    case DelimiterValidationError.ContainsWhitespace:
      return RangeLinkMessageCode.CONFIG_ERR_DELIMITER_WHITESPACE;
    case DelimiterValidationError.ContainsReservedChar:
      return RangeLinkMessageCode.CONFIG_ERR_DELIMITER_RESERVED;
    case DelimiterValidationError.HashNotSingleChar:
      return RangeLinkMessageCode.CONFIG_ERR_HASH_NOT_SINGLE_CHAR;
    default: {
      outputChannel.appendLine(
        `[CRITICAL] Unhandled DelimiterValidationError in getErrorCodeForTesting: ${error}`,
      );
      return RangeLinkMessageCode.CONFIG_ERR_UNKNOWN;
    }
  }
}

/**
 * Validates and loads delimiter configuration from VSCode settings
 */
function loadDelimiterConfig(): DelimiterConfig {
  const config = vscode.workspace.getConfiguration('rangelink');

  const userLine = config.get<string>('delimiterLine') ?? '';
  const userPosition = config.get<string>('delimiterPosition') ?? '';
  const userHash = config.get<string>('delimiterHash') ?? '';
  const userRange = config.get<string>('delimiterRange') ?? '';

  const lineResult = validateDelimiter(userLine, false);
  const positionResult = validateDelimiter(userPosition, false);
  const hashResult = validateDelimiter(userHash, true);
  const rangeResult = validateDelimiter(userRange, false);

  const errors: Array<{ name: string; code: RangeLinkMessageCode }> = [];

  if (!lineResult.success) {
    errors.push({ name: 'delimiterLine', code: getErrorCodeForTesting(lineResult.error) });
  }
  if (!positionResult.success) {
    errors.push({ name: 'delimiterPosition', code: getErrorCodeForTesting(positionResult.error) });
  }
  if (!hashResult.success) {
    errors.push({ name: 'delimiterHash', code: getErrorCodeForTesting(hashResult.error) });
  }
  if (!rangeResult.success) {
    errors.push({ name: 'delimiterRange', code: getErrorCodeForTesting(rangeResult.error) });
  }

  if (errors.length > 0) {
    for (const { name, code } of errors) {
      outputChannel.appendLine(`[ERROR] [${code}] Invalid ${name}: must be non-empty, non-numeric, and not contain reserved characters (${RESERVED_CHARS.join(', ')})`);
    }
    outputChannel.appendLine(`[INFO] [${RangeLinkMessageCode.CONFIG_USING_DEFAULTS}] Using default delimiters due to validation errors.`);
    return DEFAULT_DELIMITERS;
  }

  const userDelimiters: DelimiterConfig = {
    line: userLine,
    position: userPosition,
    hash: userHash,
    range: userRange,
  };

  // Check for uniqueness and substring conflicts (aggregate all errors before returning)
  const hasUniquenessError = !areDelimitersUnique(userDelimiters);
  const hasSubstringError = haveSubstringConflicts(userDelimiters);

  if (hasUniquenessError) {
    outputChannel.appendLine(
      `[ERROR] [${RangeLinkMessageCode.CONFIG_ERR_DELIMITER_NOT_UNIQUE}] Delimiters must be unique (case-insensitive). Custom settings ignored. Using defaults.`,
    );
  }

  if (hasSubstringError) {
    outputChannel.appendLine(
      `[ERROR] [${RangeLinkMessageCode.CONFIG_ERR_DELIMITER_SUBSTRING_CONFLICT}] Delimiters cannot be substrings of each other. Custom settings ignored. Using defaults.`,
    );
  }

  if (hasUniquenessError || hasSubstringError) {
    return DEFAULT_DELIMITERS;
  }

  // Log successful configuration load with source info
  outputChannel.appendLine(`[INFO] [${RangeLinkMessageCode.CONFIG_LOADED}] Delimiter configuration loaded:`);

  const inspectLine = config.inspect<string>('delimiterLine');
  const inspectPosition = config.inspect<string>('delimiterPosition');
  const inspectHash = config.inspect<string>('delimiterHash');
  const inspectRange = config.inspect<string>('delimiterRange');

  const getSource = (inspect: any, key: string): string => {
    if (inspect?.workspaceFolderValue !== undefined) return 'from workspace folder';
    if (inspect?.workspaceValue !== undefined) return 'from workspace';
    if (inspect?.globalValue !== undefined) return 'from user settings';
    return 'from default';
  };

  outputChannel.appendLine(
    `  - Line delimiter: '${userLine}' ${getSource(inspectLine, 'delimiterLine')}`,
  );
  outputChannel.appendLine(
    `  - Position delimiter: '${userPosition}' ${getSource(inspectPosition, 'delimiterPosition')}`,
  );
  outputChannel.appendLine(
    `  - Hash delimiter: '${userHash}' ${getSource(inspectHash, 'delimiterHash')}`,
  );
  outputChannel.appendLine(
    `  - Range delimiter: '${userRange}' ${getSource(inspectRange, 'delimiterRange')}`,
  );
  outputChannel.appendLine(
    `  - Column mode: indicated by double hash delimiter (${userHash}${userHash})`,
  );

  return userDelimiters;
}

// ============================================================================
// Extension Lifecycle
// ============================================================================

let outputChannel: vscode.OutputChannel;

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('RangeLink');

  // Initialize core library logger with VSCode adapter
  const vscodeLogger = new VSCodeLogger(outputChannel);
  setLogger(vscodeLogger);

  const delimiters = loadDelimiterConfig();
  const service = new RangeLinkService(delimiters);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.copyLinkToSelectionWithRelativePath', () =>
      service.createLink(PathFormat.WorkspaceRelative),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.copyLinkToSelectionWithAbsolutePath', () =>
      service.createLink(PathFormat.Absolute),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.copyPortableLinkToSelectionWithRelativePath', () =>
      service.createPortableLink(PathFormat.WorkspaceRelative),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.copyPortableLinkToSelectionWithAbsolutePath', () =>
      service.createPortableLink(PathFormat.Absolute),
    ),
  );

  // Register version info command
  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.showVersion', () => {
      try {
        const versionInfo = require('./version.json');
        const isDirtyIndicator = versionInfo.isDirty ? ' (with uncommitted changes)' : '';
        const message = `RangeLink v${versionInfo.version}\nCommit: ${versionInfo.commit}${isDirtyIndicator}\nBranch: ${versionInfo.branch}\nBuild: ${versionInfo.buildDate}`;
        vscode.window.showInformationMessage(message, 'Copy Commit Hash').then((selection) => {
          if (selection === 'Copy Commit Hash') {
            vscode.env.clipboard.writeText(versionInfo.commitFull);
            vscode.window.showInformationMessage('Commit hash copied to clipboard');
          }
        });
        outputChannel.appendLine(`[INFO] Version Info:\n${JSON.stringify(versionInfo, null, 2)}`);
      } catch (error) {
        vscode.window.showErrorMessage('Version information not available');
        outputChannel.appendLine(`[ERROR] Could not load version info: ${error}`);
      }
    }),
  );

  // Log version info on startup
  let activationMessage = '[INFO] RangeLink extension activated';
  try {
    const versionInfo = require('./version.json');
    const isDirtyIndicator = versionInfo.isDirty ? ' (dirty)' : '';
    activationMessage += ` - v${versionInfo.version} (${versionInfo.commit}${isDirtyIndicator})`;
  } catch (error) {
    activationMessage += ' (version info unavailable)';
  }
  outputChannel.appendLine(activationMessage);
}

/**
 * Extension deactivation cleanup
 */
export function deactivate(): void {
  // Cleanup if needed
}
