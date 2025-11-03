import {
  DEFAULT_DELIMITERS,
  DelimiterConfig,
  DelimiterValidationError,
  FormatOptions,
  FormattedLink,
  InputSelection,
  LinkType,
  PathFormat,
  RESERVED_CHARS,
  RangeFormat,
  RangeLinkMessageCode,
  Selection,
  SelectionCoverage,
  SelectionType,
  areDelimitersUnique,
  formatLink,
  getLogger,
  haveSubstringConflicts,
  setLogger,
  validateDelimiter,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { isRectangularSelection } from './isRectangularSelection';
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
 * Adapter: Converts VSCode Selections to core InputSelection interface
 * Detects coverage (FullLine vs PartialLine) for each selection
 */
function toInputSelection(
  editor: vscode.TextEditor,
  vscodeSelections: readonly vscode.Selection[],
): InputSelection {
  // VSCode doesn't expose rectangular selection mode in API
  // Use heuristic to detect rectangular selections based on patterns
  const isRectangular = isRectangularSelection(vscodeSelections);

  // When multiple selections exist but don't form a rectangular pattern,
  // only use the primary (first) selection
  const selectionsToConvert = isRectangular ? vscodeSelections : [vscodeSelections[0]];

  const selections: Selection[] = [];

  for (const sel of selectionsToConvert) {
    // Detect if this is a full-line selection
    // If lineAt throws, it means the document was modified and selection is invalid
    let coverage = SelectionCoverage.PartialLine;

    try {
      const endLine = editor.document.lineAt(sel.end.line);
      const startsAtBeginning = sel.start.character === 0;
      const endsAtEndOfLine =
        sel.end.character === endLine.range.end.character ||
        sel.end.character >= endLine.text.length ||
        (sel.end.line > sel.start.line && sel.end.character === 0);

      if (startsAtBeginning && endsAtEndOfLine) {
        coverage = SelectionCoverage.FullLine;
      }
    } catch (error) {
      // Selection references invalid line numbers - document was modified
      const message = 'Cannot generate link: document was modified and selection is no longer valid. Please reselect and try again.';
      getLogger().error(
        { fn: 'toInputSelection', error, line: sel.end.line, documentLines: editor.document.lineCount },
        'Document modified during link generation - selection out of bounds'
      );
      throw new Error(message);
    }

    selections.push({
      startLine: sel.start.line,
      startCharacter: sel.start.character,
      endLine: sel.end.line,
      endCharacter: sel.end.character,
      coverage,
    });
  }

  return {
    selections,
    selectionType: isRectangular ? SelectionType.Rectangular : SelectionType.Normal,
  };
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
        'Failed to convert selections to InputSelection'
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
        `Failed to generate ${linkType}`
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
    vscode.window.setStatusBarMessage(`✓ ${linkTypeName} copied to clipboard`, 2000);
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
      outputChannel.appendLine(
        `[ERROR] [${code}] Invalid ${name}: must be non-empty, non-numeric, and not contain reserved characters (${RESERVED_CHARS.join(', ')})`,
      );
    }
    outputChannel.appendLine(
      `[INFO] [${RangeLinkMessageCode.CONFIG_USING_DEFAULTS}] Using default delimiters due to validation errors.`,
    );
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
  outputChannel.appendLine(
    `[INFO] [${RangeLinkMessageCode.CONFIG_LOADED}] Delimiter configuration loaded:`,
  );

  const inspectLine = config.inspect<string>('delimiterLine');
  const inspectPosition = config.inspect<string>('delimiterPosition');
  const inspectHash = config.inspect<string>('delimiterHash');
  const inspectRange = config.inspect<string>('delimiterRange');

  const getSource = (inspect: any): string => {
    if (inspect?.workspaceFolderValue !== undefined) return 'from workspace folder';
    if (inspect?.workspaceValue !== undefined) return 'from workspace';
    if (inspect?.globalValue !== undefined) return 'from user settings';
    return 'from default';
  };

  outputChannel.appendLine(
    `  - Line delimiter: '${userLine}' ${getSource(inspectLine)}`,
  );
  outputChannel.appendLine(
    `  - Position delimiter: '${userPosition}' ${getSource(inspectPosition)}`,
  );
  outputChannel.appendLine(
    `  - Hash delimiter: '${userHash}' ${getSource(inspectHash)}`,
  );
  outputChannel.appendLine(
    `  - Range delimiter: '${userRange}' ${getSource(inspectRange)}`,
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
        getLogger().error(
          { fn: 'showVersion', error },
          'Failed to load version info'
        );
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
    getLogger().warn(
      { fn: 'activate', error },
      'Version info unavailable at activation'
    );
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
