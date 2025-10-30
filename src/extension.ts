import * as vscode from 'vscode';

export interface Link {
  path: string;
  startLine: number;
  endLine: number;
  startPosition?: number;
  endPosition?: number;
  isAbsolute: boolean;
}

interface DelimiterConfig {
  readonly line: string;
  readonly position: string;
  readonly hash: string;
  readonly range: string;
}

/**
 * Specifies how much detail to include in the range specification part of a link.
 * - LineOnly: Only line numbers (e.g., L10-L20)
 * - WithPositions: Line numbers + character positions (e.g., L10C5-L20C10)
 */
enum RangeFormat {
  LineOnly = 'LineOnly',
  WithPositions = 'WithPositions',
}

/**
 * Specifies the hash delimiter mode for the link.
 * - Normal: Single hash delimiter (e.g., path#L10)
 * - ColumnMode: Double hash delimiter for rectangular selections (e.g., path##L10C5-L20C10)
 */
enum HashMode {
  Normal = 'Normal',
  ColumnMode = 'ColumnMode',
}

/**
 * Specifies whether to use relative or absolute file paths in generated links.
 * - WorkspaceRelative: Path relative to workspace root (e.g., src/file.ts)
 * - Absolute: Full filesystem path (e.g., /Users/name/project/src/file.ts)
 */
export enum PathFormat {
  WorkspaceRelative = 'WorkspaceRelative',
  Absolute = 'Absolute',
}

interface ComputedSelection {
  readonly startLine: number;
  readonly endLine: number;
  readonly startPosition?: number;
  readonly endPosition?: number;
  readonly rangeFormat: RangeFormat;
  readonly hashMode: HashMode;
}

export class RangeLinkService {
  private delimiters: DelimiterConfig;

  constructor(delimiters: DelimiterConfig) {
    this.delimiters = delimiters;
  }

  private composePortableMetadata = (includePosition: boolean): string => {
    const { hash, line, range, position } = this.delimiters;
    const parts = [hash, line, range];
    if (includePosition) parts.push(position);
    return `${PORTABLE_METADATA_SEPARATOR}${parts.join(PORTABLE_METADATA_SEPARATOR)}${PORTABLE_METADATA_SEPARATOR}`;
  };

  private formatPortableFromSelection = (
    path: string,
    selections: readonly vscode.Selection[],
  ): string => {
    const spec = this.computeRangeSpec(selections);
    const anchor = this.buildAnchor(
      spec.startLine,
      spec.endLine,
      spec.startPosition,
      spec.endPosition,
      spec.rangeFormat,
    );
    const core = this.joinWithHash(path, anchor, spec.hashMode);
    const includePosition = spec.rangeFormat === RangeFormat.WithPositions;
    return `${core}${this.composePortableMetadata(includePosition)}`;
  };

  async createPortableLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }
    const document = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    let referencePath: string;
    if (workspaceFolder && pathFormat === PathFormat.WorkspaceRelative) {
      referencePath = vscode.workspace.asRelativePath(document.uri);
    } else {
      referencePath = document.uri.fsPath;
    }
    referencePath = referencePath.replace(/\\/g, '/');

    const linkString = this.formatPortableFromSelection(referencePath, editor.selections);
    await vscode.env.clipboard.writeText(linkString);
    this.showFeedback(linkString);
  }

  /**
   * Build a range specification string using current delimiters.
   * When rangeFormat is LineOnly, positions are omitted (line-only format).
   */
  private buildAnchor = (
    startLine: number,
    endLine: number,
    startPosition: number | undefined,
    endPosition: number | undefined,
    rangeFormat: RangeFormat = RangeFormat.WithPositions,
  ): string => {
    const { line: delimL, position: delimP, range: delimRange } = this.delimiters;
    if (rangeFormat === RangeFormat.LineOnly) {
      return `${delimL}${startLine}${delimRange}${delimL}${endLine}`;
    }
    const start = `${delimL}${startLine}${delimP}${startPosition ?? 1}`;
    const end = `${delimL}${endLine}${delimP}${endPosition ?? 1}`;
    return `${start}${delimRange}${end}`;
  };

  /**
   * Join a path with an anchor, adding one or two hash delimiters depending on columnMode.
   */
  private joinWithHash = (
    path: string,
    anchor: string,
    mode: HashMode = HashMode.Normal,
  ): string => {
    const { hash: delimHash } = this.delimiters;
    const prefix = mode === HashMode.ColumnMode ? `${delimHash}${delimHash}` : `${delimHash}`;
    return `${path}${prefix}${anchor}`;
  };

  private computeRangeSpec = (selections: readonly vscode.Selection[]): ComputedSelection => {
    const isColumnMode = this.isColumnSelection(selections);
    const primary = selections[0];

    const startLine = primary.start.line + 1;
    const endLine =
      (isColumnMode ? selections[selections.length - 1].start.line : primary.end.line) + 1;
    const startPosition = primary.start.character + 1;
    const endPosition = primary.end.character + 1;

    if (isColumnMode) {
      return {
        startLine,
        endLine,
        startPosition,
        endPosition,
        rangeFormat: RangeFormat.WithPositions,
        hashMode: HashMode.ColumnMode,
      };
    }

    const isFullBlock = primary.start.character === 0 && primary.end.character === 0;
    const usePositions = !isFullBlock;
    return {
      startLine,
      endLine,
      startPosition: usePositions ? startPosition : undefined,
      endPosition: usePositions ? endPosition : undefined,
      rangeFormat: usePositions ? RangeFormat.WithPositions : RangeFormat.LineOnly,
      hashMode: HashMode.Normal,
    };
  };

  /**
   * Format a simple line reference using anchor notation (e.g., path#L10).
   * Used for full-line selections that extend to end of line.
   */
  private formatSimpleLineReference = (path: string, line: number): string => {
    const { hash: delimHash, line: delimLine } = this.delimiters;
    return `${path}${delimHash}${delimLine}${line}`;
  };

  async createLink(pathFormat: PathFormat = PathFormat.WorkspaceRelative): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selections = editor.selections;
    const document = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    let referencePath: string;
    if (workspaceFolder && pathFormat === PathFormat.WorkspaceRelative) {
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
      : this.formatRegularSelectionLink(referencePath, selection, document);

    await vscode.env.clipboard.writeText(linkString);

    this.showFeedback(linkString);
  }

  /**
   * Detect if the current selection is a column (block) selection.
   * Column selections typically have multiple selections with the same character range across consecutive lines.
   */
  private isColumnSelection = (selections: readonly vscode.Selection[]): boolean => {
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
  };

  private formatColumnModeSelectionLink = (
    path: string,
    selections: readonly vscode.Selection[],
  ): string => {
    const spec = this.computeRangeSpec(selections);
    const anchor = this.buildAnchor(
      spec.startLine,
      spec.endLine,
      spec.startPosition,
      spec.endPosition,
      spec.rangeFormat,
    );
    return this.joinWithHash(path, anchor, spec.hashMode);
  };

  private formatRegularSelectionLink = (
    path: string,
    selection: vscode.Selection,
    document: vscode.TextDocument,
  ): string => {
    // Convert to 1-based indexing
    const startLine = selection.start.line + 1;
    const startPosition = selection.start.character + 1;
    const endLine = selection.end.line + 1;
    const endPosition = selection.end.character + 1;

    // Empty selections should be prevented by command enablement,
    // but guard here for safety
    if (selection.isEmpty) {
      throw new Error('RangeLink command invoked with empty selection');
    }

    // Special case: single-line selection extending to end of line
    if (startLine === endLine && startPosition === 1 && endPosition > 1) {
      const line = document.lineAt(startLine - 1);
      if (selection.end.character >= line.text.length) {
        return this.formatSimpleLineReference(path, startLine);
      }
    }

    const spec = this.computeRangeSpec([selection]);
    const anchor = this.buildAnchor(
      spec.startLine,
      spec.endLine,
      spec.startPosition,
      spec.endPosition,
      spec.rangeFormat,
    );
    return this.joinWithHash(path, anchor, spec.hashMode);
  };

  private showFeedback = (linkString: string): void => {
    vscode.window.setStatusBarMessage(`$(check) Copied Range Link: ${linkString}`, 3000);
  };
}

/**
 * Validate a delimiter value
 */
const RESERVED_CHARS = ['~', '|', '/', '\\', ':', ',', '@'];
const PORTABLE_METADATA_SEPARATOR = '~';

/**
 * Log levels for structured logging
 */
enum LogLevel {
  Info = 'INFO',
  Warning = 'WARNING',
  Error = 'ERROR',
}

/**
 * Centralized message codes for all RangeLink messages
 * Organized by category (1xxx = Configuration, 2xxx = Link Generation, etc.)
 * These codes enable future i18n support by decoupling message identification from formatting
 */
enum RangeLinkMessageCode {
  // Configuration messages (1xxx)
  CONFIG_LOADED = 'MSG_1001',
  CONFIG_USING_DEFAULTS = 'MSG_1002',
  // Reserved: MSG_1003-1010 for future configuration info messages
  CONFIG_ERR_DELIMITER_INVALID = 'ERR_1001',
  CONFIG_ERR_DELIMITER_EMPTY = 'ERR_1002',
  CONFIG_ERR_DELIMITER_DIGITS = 'ERR_1003',
  CONFIG_ERR_DELIMITER_WHITESPACE = 'ERR_1004',
  CONFIG_ERR_DELIMITER_RESERVED = 'ERR_1005',
  CONFIG_ERR_DELIMITER_NOT_UNIQUE = 'ERR_1006',
  CONFIG_ERR_DELIMITER_SUBSTRING_CONFLICT = 'ERR_1007',
  CONFIG_ERR_HASH_NOT_SINGLE_CHAR = 'ERR_1008',
  CONFIG_ERR_UNKNOWN = 'ERR_1099', // Unexpected validation error - should never occur
  // Reserved: ERR_1009-1098 for future configuration error messages

  // BYOD parsing messages (2xxx)
  // Reserved: MSG_2001-2010 for future BYOD info messages
  BYOD_ERR_INVALID_FORMAT = 'ERR_2001',
  BYOD_ERR_HASH_INVALID = 'ERR_2002',
  BYOD_ERR_DELIMITER_VALIDATION = 'ERR_2003',
  BYOD_ERR_FORMAT_MISMATCH = 'ERR_2004',
  BYOD_ERR_POSITION_RECOVERY_FAILED = 'ERR_2005',
  BYOD_ERR_COLUMN_MODE_DETECTION = 'ERR_2006',
  // Reserved: ERR_2007-2099 for future BYOD parsing errors
  BYOD_WARN_POSITION_FROM_LOCAL = 'WARN_2001',
  BYOD_WARN_POSITION_FROM_DEFAULT = 'WARN_2002',
  BYOD_WARN_EXTRA_DELIMITER = 'WARN_2003',
  // Reserved: WARN_2004-2099 for future BYOD warnings

  // Link generation messages (3xxx)
  // Reserved: MSG_3001-3010 for future link generation info messages
  // Reserved: ERR_3001-3010 for future link generation errors (LINK_ERR_* pattern)
  // Potential future codes:
  // LINK_COPIED = 'MSG_2001'
  // LINK_COPIED_ABSOLUTE = 'MSG_2002'
  // LINK_COPIED_PORTABLE = 'MSG_2003'
  // LINK_ERR_GENERATION_FAILED = 'ERR_2001'
  // LINK_ERR_NO_SELECTION = 'ERR_2002'
  // LINK_ERR_NO_ACTIVE_EDITOR = 'ERR_2003'
  // LINK_ERR_NO_WORKSPACE = 'ERR_2004'
  // LINK_ERR_EMPTY_SELECTION = 'ERR_2005'

  // Navigation messages (3xxx)
  // Reserved: MSG_3001-3010 for future navigation info messages
  // Reserved: ERR_3001-3010 for future navigation errors (NAV_ERR_* pattern)
  // Potential future codes:
  // NAV_MSG_LINK_PARSED = 'MSG_3001'
  // NAV_MSG_FILE_OPENED = 'MSG_3002'
  // NAV_MSG_RANGE_SELECTED = 'MSG_3003'
  // NAV_ERR_INVALID_LINK = 'ERR_3001'
  // NAV_ERR_FILE_NOT_FOUND = 'ERR_3002'
  // NAV_ERR_INVALID_RANGE = 'ERR_3003'
  // NAV_ERR_CLIPBOARD_EMPTY = 'ERR_3004'
  // NAV_ERR_LINK_NOT_IN_WORKSPACE = 'ERR_3005'
  // NAV_ERR_BYOD_METADATA_INVALID = 'ERR_3006'
  // NAV_ERR_BYOD_METADATA_MISSING = 'ERR_3007'
  // NAV_MSG_COLUMN_MODE_RECONSTRUCTED = 'MSG_3004'

  // Multi-range messages (4xxx)
  // Reserved: MSG_4001-4010 for future multi-range info messages
  // Reserved: ERR_4001-4010 for future multi-range errors (MULTIRANGE_ERR_* pattern)
  // Potential future codes:
  // MULTIRANGE_MSG_DETECTED = 'MSG_4001'
  // MULTIRANGE_MSG_GENERATED = 'MSG_4002'
  // MULTIRANGE_MSG_PARSED = 'MSG_4003'
  // MULTIRANGE_ERR_INVALID = 'ERR_4001'

  // Circular selection messages (5xxx)
  // Reserved: MSG_5001-5010 for future circular selection info messages
  // Reserved: ERR_5001-5010 for future circular selection errors (CIRCULAR_ERR_* pattern)
  // Reserved: WARN_5001-5010 for future circular selection warnings (CIRCULAR_WARN_* pattern)
  // Potential future codes:
  // CIRCULAR_MSG_RANGE_GENERATED = 'MSG_5001'
  // CIRCULAR_MSG_RANGE_PARSED = 'MSG_5002'
  // CIRCULAR_ERR_INVALID_RADIUS = 'ERR_5001'
  // CIRCULAR_WARN_NOT_SUPPORTED = 'WARN_5001'

  // Portable link (BYOD) messages (6xxx)
  // Reserved: MSG_6001-6010 for future BYOD info messages
  // Reserved: ERR_6001-6010 for future BYOD errors (BYOD_ERR_* pattern)
  // Reserved: WARN_6001-6010 for future BYOD warnings (BYOD_WARN_* pattern)
  // Potential future codes:
  // BYOD_MSG_GENERATED = 'MSG_6001'
  // BYOD_MSG_PARSED = 'MSG_6002'
  // BYOD_MSG_METADATA_EXTRACTED = 'MSG_6003'
  // BYOD_ERR_INVALID_FORMAT = 'ERR_6001'
  // BYOD_WARN_DELIMITER_CONFLICT = 'WARN_6001'
}

/**
 * Structured log message interface
 * Separates message identification (code) from rendering (message)
 * Enables future i18n by allowing code-to-template mapping
 */
interface LogMessage {
  level: LogLevel;
  code: RangeLinkMessageCode;
  message: string; // Rendered message (currently English, future: localized from templates)
}

/**
 * Validation error codes for delimiter validation
 * These codes enable future i18n support by decoupling error identification from message formatting
 */
export enum DelimiterValidationError {
  None = 'VALID',
  Empty = 'ERR_EMPTY',
  ContainsDigits = 'ERR_DIGITS',
  ContainsWhitespace = 'ERR_WHITESPACE',
  ContainsReservedChar = 'ERR_RESERVED',
  HashNotSingleChar = 'ERR_HASH_NOT_SINGLE',
}

/**
 * Validate a delimiter value and return an error code
 * @param value The delimiter value to validate
 * @param isHash Optional flag to indicate if this is a hash delimiter (must be single character)
 * @returns DelimiterValidationError code (VALID if valid, error code otherwise)
 */
export function validateDelimiter(
  value: string,
  isHash: boolean = false,
): DelimiterValidationError {
  if (!value || value.trim() === '') {
    return DelimiterValidationError.Empty;
  }
  // Hash delimiter must be exactly 1 character
  if (isHash && value.length !== 1) {
    return DelimiterValidationError.HashNotSingleChar;
  }
  // Must not contain digits
  if (/\d/.test(value)) {
    return DelimiterValidationError.ContainsDigits;
  }
  // Must not contain whitespace
  if (/\s/.test(value)) {
    return DelimiterValidationError.ContainsWhitespace;
  }
  // Must not contain any reserved characters anywhere
  for (const ch of RESERVED_CHARS) {
    if (value.includes(ch)) {
      return DelimiterValidationError.ContainsReservedChar;
    }
  }
  return DelimiterValidationError.None;
}

/**
 * Validate all delimiters are unique (case-insensitive comparison)
 * This prevents user errors from inconsistent casing (e.g., "L" vs "l")
 */
function areDelimitersUnique(delimiters: DelimiterConfig): boolean {
  const values = [delimiters.line, delimiters.position, delimiters.hash, delimiters.range];
  const lowerCaseValues = values.map((v) => v.toLowerCase());
  return new Set(lowerCaseValues).size === lowerCaseValues.length;
}

/**
 * Check for substring conflicts between delimiters (case-insensitive)
 * Prevents ambiguous parsing by ensuring no delimiter is a substring of another
 */
function haveSubstringConflicts(delimiters: DelimiterConfig): boolean {
  const values = [delimiters.line, delimiters.position, delimiters.hash, delimiters.range];
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;
      const a = values[i].toLowerCase();
      const b = values[j].toLowerCase();
      if (a.length === 0 || b.length === 0) continue;
      if (a.includes(b)) {
        return true;
      }
    }
  }
  return false;
}

let outputChannel: vscode.OutputChannel | undefined;

/**
 * Log a structured message to the output channel
 * @param logMessage The structured log message with level, code, and rendered message
 */
function logMessage(logMessage: LogMessage): void {
  if (outputChannel) {
    const prefix = `[${logMessage.level}] [${logMessage.code}]`;
    outputChannel.appendLine(`${prefix} ${logMessage.message}`);
  }
}

/**
 * Log an info message (backward compatibility wrapper)
 * @param code Message code
 * @param message Rendered message
 */
function logInfo(code: RangeLinkMessageCode, message: string): void {
  logMessage({ level: LogLevel.Info, code, message });
}

/**
 * Log a warning message
 * @param code Message code
 * @param message Rendered message
 * @internal For future use when warnings are needed
 */
export function logWarning(code: RangeLinkMessageCode, message: string): void {
  logMessage({ level: LogLevel.Warning, code, message });
}

/**
 * Log an error message (backward compatibility wrapper)
 * @param code Message code
 * @param message Rendered message
 */
function logError(code: RangeLinkMessageCode, message: string): void {
  logMessage({ level: LogLevel.Error, code, message });
}

/**
 * Legacy log function for plain info messages (maintained for backward compatibility)
 * @deprecated Use logInfo() with a message code instead
 * @internal Used internally for configuration logging
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function log(message: string): void {
  logInfo(RangeLinkMessageCode.CONFIG_LOADED, message);
}

/**
 * Map DelimiterValidationError to RangeLinkMessageCode
 * Exported for testing the default case (CONFIG_ERR_UNKNOWN)
 */
export function getErrorCodeForTesting(error: DelimiterValidationError): RangeLinkMessageCode {
  switch (error) {
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
    default:
      // This should never happen - indicates a bug in validation logic
      return RangeLinkMessageCode.CONFIG_ERR_UNKNOWN;
  }
}

/**
 * Load and validate delimiter configuration
 */
function loadDelimiterConfig(): DelimiterConfig {
  const config = vscode.workspace.getConfiguration('rangelink');

  // Inspect all configuration values to get their source and defaults
  const lineInspect = config.inspect('delimiterLine');
  const columnInspect = undefined as any; // legacy
  const positionInspect = config.inspect('delimiterPosition');
  const hashInspect = config.inspect('delimiterHash');
  const rangeInspect = config.inspect('delimiterRange');

  // Extract default values from VS Code (these come from package.json)
  const defaults: DelimiterConfig = {
    line: (lineInspect?.defaultValue as string) || 'L',
    position: (positionInspect?.defaultValue as string) || 'C',
    hash: (hashInspect?.defaultValue as string) || '#',
    range: (rangeInspect?.defaultValue as string) || '-',
  };

  const lineConfig = config.get<string>('delimiterLine', defaults.line);
  const positionConfig = config.get<string>('delimiterPosition', defaults.position);
  const hashConfig = config.get<string>('delimiterHash', defaults.hash);
  const rangeConfig = config.get<string>('delimiterRange', defaults.range);

  // Validate each delimiter and map to specific error codes
  const lineError = validateDelimiter(lineConfig);
  const positionError = validateDelimiter(positionConfig);
  const hashError = validateDelimiter(hashConfig, true); // Hash must be single character
  const rangeError = validateDelimiter(rangeConfig);

  // Use the exported function for actual use
  const getErrorCode = getErrorCodeForTesting;

  // Log specific validation errors with their codes (de-duplicated)
  const validations: Array<{
    name: 'delimiterLine' | 'delimiterPosition' | 'delimiterHash' | 'delimiterRange';
    value: string;
    error: DelimiterValidationError;
  }> = [
    { name: 'delimiterLine', value: lineConfig, error: lineError },
    { name: 'delimiterPosition', value: positionConfig, error: positionError },
    { name: 'delimiterHash', value: hashConfig, error: hashError },
    { name: 'delimiterRange', value: rangeConfig, error: rangeError },
  ];

  for (const v of validations) {
    if (v.error === DelimiterValidationError.None) continue;
    const errorCode = getErrorCode(v.error);
    if (errorCode === RangeLinkMessageCode.CONFIG_ERR_UNKNOWN) {
      logError(
        errorCode,
        `CRITICAL: Unknown validation error for ${v.name} value "${v.value}" (error type: ${v.error}). This indicates a bug in validation logic.`,
      );
    } else {
      logError(errorCode, `Invalid ${v.name} value "${v.value}"`);
    }
  }

  const candidate: DelimiterConfig = {
    line: lineError === DelimiterValidationError.None ? lineConfig : defaults.line,
    position: positionError === DelimiterValidationError.None ? positionConfig : defaults.position,
    hash: hashError === DelimiterValidationError.None ? hashConfig : defaults.hash,
    range: rangeError === DelimiterValidationError.None ? rangeConfig : defaults.range,
  };

  if (!areDelimitersUnique(candidate)) {
    logError(RangeLinkMessageCode.CONFIG_ERR_DELIMITER_NOT_UNIQUE, 'Delimiters must be unique');
  }
  if (haveSubstringConflicts(candidate)) {
    logError(
      RangeLinkMessageCode.CONFIG_ERR_DELIMITER_SUBSTRING_CONFLICT,
      'Delimiters must not be substrings of one another',
    );
  }

  // If any validation failed, use defaults
  const hasValidationErrors =
    lineError !== DelimiterValidationError.None ||
    positionError !== DelimiterValidationError.None ||
    hashError !== DelimiterValidationError.None ||
    rangeError !== DelimiterValidationError.None ||
    !areDelimitersUnique(candidate) ||
    haveSubstringConflicts(candidate);

  if (hasValidationErrors) {
    logInfo(
      RangeLinkMessageCode.CONFIG_USING_DEFAULTS,
      `Using default delimiter configuration: line="${defaults.line}", position="${defaults.position}", hash="${defaults.hash}", range="${defaults.range}"`,
    );
    return defaults;
  }

  // Log configuration sources on startup
  const getSource = (inspect: ReturnType<typeof config.inspect>): string => {
    if (inspect?.workspaceFolderValue !== undefined) return 'workspace folder';
    if (inspect?.workspaceValue !== undefined) return 'workspace';
    if (inspect?.globalValue !== undefined) return 'user';
    return 'default';
  };

  logInfo(RangeLinkMessageCode.CONFIG_LOADED, 'Delimiter configuration loaded:');
  logInfo(
    RangeLinkMessageCode.CONFIG_LOADED,
    `  - Line delimiter: "${candidate.line}" (from ${getSource(lineInspect)})`,
  );
  logInfo(
    RangeLinkMessageCode.CONFIG_LOADED,
    `  - Position delimiter: "${candidate.position}" (from ${getSource(positionInspect)})`,
  );
  logInfo(
    RangeLinkMessageCode.CONFIG_LOADED,
    `  - Hash delimiter: "${candidate.hash}" (from ${getSource(hashInspect)})`,
  );
  logInfo(
    RangeLinkMessageCode.CONFIG_LOADED,
    `  - Range delimiter: "${candidate.range}" (from ${getSource(rangeInspect)})`,
  );
  logInfo(
    RangeLinkMessageCode.CONFIG_LOADED,
    `  - Column mode: indicated by double hash delimiter (${candidate.hash}${candidate.hash})`,
  );

  return candidate;
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
      await currentService.createLink(PathFormat.WorkspaceRelative);
    },
  );

  const copyLinkToSelectionWithAbsolutePath = vscode.commands.registerCommand(
    'rangelink.copyLinkToSelectionWithAbsolutePath',
    async () => {
      await currentService.createLink(PathFormat.Absolute);
    },
  );

  const copyPortableLinkRelative = vscode.commands.registerCommand(
    'rangelink.copyPortableLinkToSelectionWithRelativePath',
    async () => {
      await currentService.createPortableLink(PathFormat.WorkspaceRelative);
    },
  );

  const copyPortableLinkAbsolute = vscode.commands.registerCommand(
    'rangelink.copyPortableLinkToSelectionWithAbsolutePath',
    async () => {
      await currentService.createPortableLink(PathFormat.Absolute);
    },
  );

  context.subscriptions.push(
    copyLinkToSelectionWithRelativePath,
    copyLinkToSelectionWithAbsolutePath,
    copyPortableLinkRelative,
    copyPortableLinkAbsolute,
  );
}

export function deactivate(): void {
  outputChannel = undefined;
}
