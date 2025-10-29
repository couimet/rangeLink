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

export class RangeLinkService {
  private delimiters: DelimiterConfig;

  constructor(delimiters: DelimiterConfig) {
    this.delimiters = delimiters;
  }

  async createLink(useAbsolutePath: boolean = false): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const document = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    let referencePath: string;
    if (workspaceFolder && !useAbsolutePath) {
      referencePath = vscode.workspace.asRelativePath(document.uri);
    } else {
      referencePath = document.uri.fsPath;
    }

    referencePath = referencePath.replace(/\\/g, '/');

    const linkString = this.formatLink(referencePath, selection);

    await vscode.env.clipboard.writeText(linkString);

    this.showFeedback(linkString);
  }

  /**
   * Format a link string based on the selection
   */
  private formatLink(path: string, selection: vscode.Selection): string {
    // Convert to 1-based indexing
    const startLine = selection.start.line + 1;
    const startColumn = selection.start.character + 1;
    const endLine = selection.end.line + 1;
    const endColumn = selection.end.character + 1;

    const { line: delimL, column: delimC, hash: delimHash, range: delimRange } = this.delimiters;

    if (selection.isEmpty) {
      return `${path}:${startLine}`;
    }

    if (startLine === endLine) {
      const lineNum = `${delimL}${startLine}`;

      if (startColumn === 1 && endColumn > 1) {
        const line = vscode.window.activeTextEditor!.document.lineAt(startLine - 1);
        if (selection.end.character >= line.text.length) {
          return `${path}:${startLine}`;
        }
      }

      return `${path}${delimHash}${lineNum}${delimC}${startColumn}${delimRange}${lineNum}${delimC}${endColumn}`;
    }

    const isFullBlock = selection.start.character === 0 && selection.end.character === 0;

    if (isFullBlock) {
      return `${path}${delimHash}${delimL}${startLine}${delimRange}${delimL}${endLine}`;
    }

    return `${path}${delimHash}${delimL}${startLine}${delimC}${startColumn}${delimRange}${delimL}${endLine}${delimC}${endColumn}`;
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

  const delimiters: DelimiterConfig = { line, column, hash, range };

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
