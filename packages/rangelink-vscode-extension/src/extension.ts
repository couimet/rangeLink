import { type DelimiterConfig, getLogger, setLogger } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { loadDelimiterConfig as loadDelimiterConfigFromModule } from './config';
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
 * Thin wrapper that adapts VSCode config to loadDelimiterConfig
 * Handles VSCode-specific concerns: output channel visibility on errors
 */
const getDelimitersForExtension = (): DelimiterConfig => {
  const vscodeConfig = vscode.workspace.getConfiguration('rangelink');
  const logger = getLogger();

  // Adapt VSCode WorkspaceConfiguration to ConfigGetter interface
  // VSCode's inspect() returns extra language-specific fields we don't need
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = vscodeConfig as any;

  const result = loadDelimiterConfigFromModule(config, logger);

  // Extension-specific: Show error notification if there were errors
  if (result.errors.length > 0) {
    vscode.window.showErrorMessage(
      `RangeLink: Invalid delimiter configuration. Using defaults. Check Output → RangeLink for details.`,
    );
  }

  return result.delimiters;
};

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

  const delimiters = getDelimitersForExtension();
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
