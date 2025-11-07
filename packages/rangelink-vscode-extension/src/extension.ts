import {
  DEFAULT_DELIMITERS,
  DelimiterConfig,
  DelimiterValidationError,
  RESERVED_CHARS,
  RangeLinkMessageCode,
  areDelimitersUnique,
  getLogger,
  haveSubstringConflicts,
  setLogger,
  validateDelimiter,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { RangeLinkDocumentProvider } from './navigation/RangeLinkDocumentProvider';
import { RangeLinkNavigationHandler } from './navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from './navigation/RangeLinkTerminalProvider';
import { PathFormat, RangeLinkService } from './RangeLinkService';
import { TerminalBindingManager } from './TerminalBindingManager';
import { VSCodeLogger } from './VSCodeLogger';

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
      return RangeLinkMessageCode.CONFIG_DELIMITER_EMPTY;
    case DelimiterValidationError.ContainsDigits:
      return RangeLinkMessageCode.CONFIG_DELIMITER_DIGITS;
    case DelimiterValidationError.ContainsWhitespace:
      return RangeLinkMessageCode.CONFIG_DELIMITER_WHITESPACE;
    case DelimiterValidationError.ContainsReservedChar:
      return RangeLinkMessageCode.CONFIG_DELIMITER_RESERVED;
    case DelimiterValidationError.HashNotSingleChar:
      return RangeLinkMessageCode.CONFIG_HASH_NOT_SINGLE_CHAR;
    default: {
      outputChannel.appendLine(
        `[CRITICAL] Unhandled DelimiterValidationError in getErrorCodeForTesting: ${error}`,
      );
      return RangeLinkMessageCode.CONFIG_UNKNOWN;
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
      `[ERROR] [${RangeLinkMessageCode.CONFIG_DELIMITER_NOT_UNIQUE}] Delimiters must be unique (case-insensitive). Custom settings ignored. Using defaults.`,
    );
  }

  if (hasSubstringError) {
    outputChannel.appendLine(
      `[ERROR] [${RangeLinkMessageCode.CONFIG_DELIMITER_SUBSTRING_CONFLICT}] Delimiters cannot be substrings of each other. Custom settings ignored. Using defaults.`,
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

  outputChannel.appendLine(`  - Line delimiter: '${userLine}' ${getSource(inspectLine)}`);
  outputChannel.appendLine(
    `  - Position delimiter: '${userPosition}' ${getSource(inspectPosition)}`,
  );
  outputChannel.appendLine(`  - Hash delimiter: '${userHash}' ${getSource(inspectHash)}`);
  outputChannel.appendLine(`  - Range delimiter: '${userRange}' ${getSource(inspectRange)}`);
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
  const terminalBindingManager = new TerminalBindingManager(context);
  const service = new RangeLinkService(delimiters, terminalBindingManager);

  // Register terminalBindingManager for automatic disposal on deactivation
  context.subscriptions.push(terminalBindingManager);

  // Create shared navigation handler (used by both terminal and document providers)
  const navigationHandler = new RangeLinkNavigationHandler(delimiters, getLogger());
  getLogger().debug({ fn: 'activate' }, 'Navigation handler created');

  // Register terminal link provider for clickable links
  const terminalLinkProvider = new RangeLinkTerminalProvider(navigationHandler, getLogger());
  context.subscriptions.push(vscode.window.registerTerminalLinkProvider(terminalLinkProvider));
  getLogger().debug({ fn: 'activate' }, 'Terminal link provider registered');

  // Register document link provider for clickable links in editor files
  // Only register for specific schemes to prevent infinite recursion when scanning output channels
  const documentLinkProvider = new RangeLinkDocumentProvider(navigationHandler, getLogger());
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      [
        { scheme: 'file' }, // Regular files (markdown, code, etc.)
        { scheme: 'untitled' }, // Unsaved/new files (scratchpad workflow)
      ],
      documentLinkProvider,
    ),
  );
  getLogger().debug({ fn: 'activate' }, 'Document link provider registered');

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
        getLogger().info(
          { fn: 'showVersion', version: versionInfo.version, commit: versionInfo.commit },
          'Version info displayed',
        );
      } catch (error) {
        getLogger().error({ fn: 'showVersion', error }, 'Failed to load version info');
        vscode.window.showErrorMessage('Version information not available');
      }
    }),
  );

  // Register terminal binding commands
  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.bindToTerminal', () => {
      terminalBindingManager.bind();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.unbindTerminal', () => {
      terminalBindingManager.unbind();
    }),
  );

  // Register document link navigation command
  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.handleDocumentLinkClick', (args) => {
      return documentLinkProvider.handleLinkClick(args);
    }),
  );

  // Log version info on startup
  try {
    const versionInfo = require('./version.json');
    getLogger().info(
      {
        fn: 'activate',
        version: versionInfo.version,
        commit: versionInfo.commit,
        isDirty: versionInfo.isDirty,
        branch: versionInfo.branch,
      },
      `RangeLink extension activated - v${versionInfo.version} (${versionInfo.commit}${versionInfo.isDirty ? ' dirty' : ''})`,
    );
  } catch (error) {
    getLogger().warn(
      { fn: 'activate', error },
      'RangeLink extension activated (version info unavailable)',
    );
  }
}

/**
 * Extension deactivation cleanup
 */
export function deactivate(): void {
  // Cleanup if needed
}
