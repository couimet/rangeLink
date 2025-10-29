import * as vscode from 'vscode';

export interface Link {
  path: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  isAbsolute: boolean;
}

interface DelimiterConfig {
  line: string;
  column: string;
  hash: string;
  range: string;
}

// Enums to clarify intent for anchor format and hash mode
enum AnchorColumns {
  WithColumns = 'WithColumns',
  LineOnly = 'LineOnly',
}

enum HashMode {
  Normal = 'Normal',
  ColumnMode = 'ColumnMode',
}

export class RangeLinkService {
  private delimiters: DelimiterConfig;

  constructor(delimiters: DelimiterConfig) {
    this.delimiters = delimiters;
  }

  /**
   * Build an anchor string for a range using current delimiters.
   * When useColumns is false, columns are omitted (line-only anchor).
   */
  private buildAnchor(
    startLine: number,
    endLine: number,
    startColumn: number | undefined,
    endColumn: number | undefined,
    columns: AnchorColumns = AnchorColumns.WithColumns,
  ): string {
    const { line: delimL, column: delimC, range: delimRange } = this.delimiters;
    if (columns === AnchorColumns.LineOnly) {
      return `${delimL}${startLine}${delimRange}${delimL}${endLine}`;
    }
    const start = `${delimL}${startLine}${delimC}${startColumn ?? 1}`;
    const end = `${delimL}${endLine}${delimC}${endColumn ?? 1}`;
    return `${start}${delimRange}${end}`;
  }

  /**
   * Join a path with an anchor, adding one or two hash delimiters depending on columnMode.
   */
  private joinWithHash(path: string, anchor: string, mode: HashMode = HashMode.Normal): string {
    const { hash: delimHash } = this.delimiters;
    const prefix = mode === HashMode.ColumnMode ? `${delimHash}${delimHash}` : `${delimHash}`;
    return `${path}${prefix}${anchor}`;
  }

  /**
   * Format a simple line reference using colon separator (e.g., path:10).
   * Used for empty selections and full-line selections that extend to end.
   */
  private formatSimpleLineReference(path: string, line: number): string {
    return `${path}:${line}`;
  }

  async createLink(useAbsolutePath: boolean = false): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selections = editor.selections;
    const document = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    let referencePath: string;
    if (workspaceFolder && !useAbsolutePath) {
      referencePath = vscode.workspace.asRelativePath(document.uri);
    } else {
      referencePath = document.uri.fsPath;
    }

    referencePath = referencePath.replace(/\\/g, '/');

    // Detect column-mode selection (multiple selections with same column range)
    const isColumnMode = this.isColumnSelection(selections);

    // Use the primary selection for formatting
    const selection = selections[0];
    const linkString = isColumnMode
      ? this.formatColumnModeSelectionLink(referencePath, selections)
      : this.formatRegularSelectionLink(referencePath, selection);

    await vscode.env.clipboard.writeText(linkString);

    this.showFeedback(linkString);
  }

  /**
   * Detect if the current selection is a column (block) selection.
   * Column selections typically have multiple selections with the same character range across consecutive lines.
   */
  private isColumnSelection(selections: readonly vscode.Selection[]): boolean {
    // Need at least 2 selections to be a column selection
    if (selections.length < 2) {
      return false;
    }

    // Get the character range from the first selection
    const firstStartChar = selections[0].start.character;
    const firstEndChar = selections[0].end.character;

    // Check if all selections have the same character range
    const allHaveSameCharacterRange = selections.every(
      (sel) => sel.start.character === firstStartChar && sel.end.character === firstEndChar,
    );

    if (!allHaveSameCharacterRange) {
      return false;
    }

    // Check if selections are on consecutive lines
    const lines = selections.map((sel) => sel.start.line).sort((a, b) => a - b);
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] !== lines[i - 1] + 1) {
        return false;
      }
    }

    return true;
  }

  private formatColumnModeSelectionLink(
    path: string,
    selections: readonly vscode.Selection[],
  ): string {
    // Sort selections by line number
    const sortedSelections = [...selections].sort((a, b) => a.start.line - b.start.line);

    const firstSelection = sortedSelections[0];
    const lastSelection = sortedSelections[sortedSelections.length - 1];

    const startLine = firstSelection.start.line + 1;
    const endLine = lastSelection.start.line + 1;
    const startColumn = firstSelection.start.character + 1;
    const endColumn = firstSelection.end.character + 1;

    const anchor = this.buildAnchor(
      startLine,
      endLine,
      startColumn,
      endColumn,
      AnchorColumns.WithColumns,
    );
    return this.joinWithHash(path, anchor, HashMode.ColumnMode);
  }

  private formatRegularSelectionLink(path: string, selection: vscode.Selection): string {
    // Convert to 1-based indexing
    const startLine = selection.start.line + 1;
    const startColumn = selection.start.character + 1;
    const endLine = selection.end.line + 1;
    const endColumn = selection.end.character + 1;

    // Empty selections should be prevented by command enablement,
    // but guard here for safety
    if (selection.isEmpty) {
      throw new Error('RangeLink command invoked with empty selection');
    }

    // Special case: single-line selection extending to end of line
    if (startLine === endLine && startColumn === 1 && endColumn > 1) {
      const line = vscode.window.activeTextEditor!.document.lineAt(startLine - 1);
      if (selection.end.character >= line.text.length) {
        return this.formatSimpleLineReference(path, startLine);
      }
    }

    // Determine values to use for anchor
    const isFullBlock = selection.start.character === 0 && selection.end.character === 0;
    const useColumns = !isFullBlock;

    const startLineToUse = startLine;
    const endLineToUse = endLine;
    const startColumnToUse = useColumns ? startColumn : undefined;
    const endColumnToUse = useColumns ? endColumn : undefined;
    const columnsMode = useColumns ? AnchorColumns.WithColumns : AnchorColumns.LineOnly;

    // Build anchor and join with hash in a single location
    const anchor = this.buildAnchor(
      startLineToUse,
      endLineToUse,
      startColumnToUse,
      endColumnToUse,
      columnsMode,
    );
    return this.joinWithHash(path, anchor, HashMode.Normal);
  }

  private showFeedback(linkString: string): void {
    vscode.window.setStatusBarMessage(`$(check) Copied Range Link: ${linkString}`, 3000);
  }
}

/**
 * Validate a delimiter value
 */
function isValidDelimiter(value: string): boolean {
  if (!value || value.trim() === '') {
    return false;
  }
  // Check if it contains any number
  if (/\d/.test(value)) {
    return false;
  }
  return true;
}

/**
 * Validate all delimiters are unique
 */
function areDelimitersUnique(delimiters: DelimiterConfig): boolean {
  const values = [delimiters.line, delimiters.column, delimiters.hash, delimiters.range];
  return new Set(values).size === values.length;
}

let outputChannel: vscode.OutputChannel | undefined;

/**
 * Log a message to the output channel
 */
function log(message: string): void {
  if (outputChannel) {
    outputChannel.appendLine(message);
  }
}

/**
 * Log an error to the output channel
 */
function logError(message: string): void {
  if (outputChannel) {
    outputChannel.appendLine(`[ERROR] ${message}`);
  }
}

/**
 * Load and validate delimiter configuration
 */
function loadDelimiterConfig(): DelimiterConfig {
  const config = vscode.workspace.getConfiguration('rangelink');

  // Inspect all configuration values to get their source and defaults
  const lineInspect = config.inspect('delimiterLine');
  const columnInspect = config.inspect('delimiterColumn');
  const hashInspect = config.inspect('delimiterHash');
  const rangeInspect = config.inspect('delimiterRange');

  // Extract default values from VS Code (these come from package.json)
  const defaults: DelimiterConfig = {
    line: (lineInspect?.defaultValue as string) || 'L',
    column: (columnInspect?.defaultValue as string) || 'C',
    hash: (hashInspect?.defaultValue as string) || '#',
    range: (rangeInspect?.defaultValue as string) || '-',
  };

  const lineConfig = config.get<string>('delimiterLine', defaults.line);
  const columnConfig = config.get<string>('delimiterColumn', defaults.column);
  const hashConfig = config.get<string>('delimiterHash', defaults.hash);
  const rangeConfig = config.get<string>('delimiterRange', defaults.range);

  // Validate individual delimiters and log when non-default values are ignored
  const line = isValidDelimiter(lineConfig) ? lineConfig : defaults.line;
  if (line !== lineConfig) {
    logError(`Invalid delimiterLine value "${lineConfig}". Using default "${line}".`);
  }

  const column = isValidDelimiter(columnConfig) ? columnConfig : defaults.column;
  if (column !== columnConfig) {
    logError(`Invalid delimiterColumn value "${columnConfig}". Using default "${column}".`);
  }

  const hash = isValidDelimiter(hashConfig) ? hashConfig : defaults.hash;
  if (hash !== hashConfig) {
    logError(`Invalid delimiterHash value "${hashConfig}". Using default "${hash}".`);
  }

  const range = isValidDelimiter(rangeConfig) ? rangeConfig : defaults.range;
  if (range !== rangeConfig) {
    logError(`Invalid delimiterRange value "${rangeConfig}". Using default "${range}".`);
  }

  const delimiters: DelimiterConfig = {
    line,
    column,
    hash,
    range,
  };

  // Validate uniqueness
  if (!areDelimitersUnique(delimiters)) {
    logError('Delimiters must be unique. Custom settings ignored. Using defaults.');
    return defaults;
  }

  // Log configuration sources on startup
  const getSource = (inspect: ReturnType<typeof config.inspect>): string => {
    if (inspect?.workspaceFolderValue !== undefined) return 'workspace folder';
    if (inspect?.workspaceValue !== undefined) return 'workspace';
    if (inspect?.globalValue !== undefined) return 'user';
    return 'default';
  };

  log('Delimiter configuration loaded:');
  log(`  - Line delimiter: "${line}" (from ${getSource(lineInspect)})`);
  log(`  - Column delimiter: "${column}" (from ${getSource(columnInspect)})`);
  log(`  - Hash delimiter: "${hash}" (from ${getSource(hashInspect)})`);
  log(`  - Range delimiter: "${range}" (from ${getSource(rangeInspect)})`);
  log(`  - Column mode: indicated by double hash delimiter (${hash}${hash})`);

  return delimiters;
}

export function activate(context: vscode.ExtensionContext): void {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('RangeLink');
  context.subscriptions.push(outputChannel);

  const delimiters = loadDelimiterConfig();
  const currentService = new RangeLinkService(delimiters);

  const copyLinkToSelectionWithRelativePath = vscode.commands.registerCommand(
    'rangelink.copyLinkToSelectionWithRelativePath',
    async () => {
      await currentService.createLink(false);
    },
  );

  const copyLinkToSelectionWithAbsolutePath = vscode.commands.registerCommand(
    'rangelink.copyLinkToSelectionWithAbsolutePath',
    async () => {
      await currentService.createLink(true);
    },
  );

  context.subscriptions.push(
    copyLinkToSelectionWithRelativePath,
    copyLinkToSelectionWithAbsolutePath,
  );
}

export function deactivate(): void {
  outputChannel = undefined;
}
