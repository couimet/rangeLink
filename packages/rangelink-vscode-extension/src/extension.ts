import { getLogger, setLogger } from 'barebone-logger';
import * as vscode from 'vscode';

import { getDelimitersForExtension } from './config';
import { DestinationFactory } from './destinations/DestinationFactory';
import { PasteDestinationManager } from './destinations/PasteDestinationManager';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { RangeLinkDocumentProvider } from './navigation/RangeLinkDocumentProvider';
import { RangeLinkNavigationHandler } from './navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from './navigation/RangeLinkTerminalProvider';
import { PathFormat, RangeLinkService } from './RangeLinkService';
import { registerWithLogging } from './utils/registerWithLogging';
import { VSCodeLogger } from './VSCodeLogger';

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

  // Load delimiter configuration
  const vscodeConfig = vscode.workspace.getConfiguration('rangelink');
  const ideAdapter = new VscodeAdapter(vscode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delimiters = getDelimitersForExtension(vscodeConfig as any, ideAdapter, getLogger());

  // Create unified destination manager (Phase 3)
  const factory = new DestinationFactory(getLogger());
  const destinationManager = new PasteDestinationManager(context, factory, ideAdapter, getLogger());

  const service = new RangeLinkService(delimiters, ideAdapter, destinationManager);

  // Register destinationManager for automatic disposal on deactivation
  context.subscriptions.push(destinationManager);

  // Create shared navigation handler (used by both terminal and document providers)
  const navigationHandler = new RangeLinkNavigationHandler(delimiters, ideAdapter, getLogger());
  getLogger().debug({ fn: 'activate' }, 'Navigation handler created');

  // Register terminal link provider for clickable links
  const terminalLinkProvider = new RangeLinkTerminalProvider(
    navigationHandler,
    ideAdapter,
    getLogger(),
  );
  context.subscriptions.push(
    registerWithLogging(
      vscode.window.registerTerminalLinkProvider(terminalLinkProvider),
      'Terminal link provider registered',
    ),
  );

  // Register document link provider for clickable links in editor files
  // Only register for specific schemes to prevent infinite recursion when scanning output channels
  const documentLinkProvider = new RangeLinkDocumentProvider(navigationHandler, getLogger());
  context.subscriptions.push(
    registerWithLogging(
      vscode.languages.registerDocumentLinkProvider(
        [
          { scheme: 'file' }, // Regular files (markdown, code, etc.)
          { scheme: 'untitled' }, // Unsaved/new files (scratchpad workflow)
        ],
        documentLinkProvider,
      ),
      'Document link provider registered',
    ),
  );

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
          {
            fn: 'showVersion',
            version: versionInfo.version,
            commit: versionInfo.commit,
            buildDate: versionInfo.buildDate,
          },
          'Version info displayed',
        );
      } catch (error) {
        getLogger().error({ fn: 'showVersion', error }, 'Failed to load version info');
        vscode.window.showErrorMessage('Version information not available');
      }
    }),
  );

  // Register destination binding commands
  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.bindToTerminal', async () => {
      await destinationManager.bind('terminal');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.bindToTextEditor', async () => {
      await destinationManager.bind('text-editor');
    }),
  );

  // Register AI assistant destination binding commands
  // Both commands are always registered to make them discoverable in Command Palette
  // Runtime availability checks show helpful messages when IDE/extension not available
  // This prevents "command not found" errors while maintaining discoverability
  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.bindToCursorAI', async () => {
      const cursorDestination = factory.create('cursor-ai');
      if (!(await cursorDestination.isAvailable())) {
        void vscode.window.showInformationMessage(
          "This command is designed for Cursor IDE, which has built-in AI chat.\n\nRangeLink can paste code ranges directly into Cursor's AI chat for faster context sharing. To use this feature, open your project in Cursor IDE instead of VS Code.",
        );
        return;
      }
      await destinationManager.bind('cursor-ai');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.bindToClaudeCode', async () => {
      const claudeCodeDestination = factory.create('claude-code');
      if (!(await claudeCodeDestination.isAvailable())) {
        void vscode.window.showInformationMessage(
          'RangeLink can seamlessly integrate with Claude Code for faster context sharing of precise code ranges.\n\nInstall and activate the Claude Code extension to use it as a paste destination.',
        );
        return;
      }
      await destinationManager.bind('claude-code');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.unbindDestination', () => {
      destinationManager.unbind();
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
        buildDate: versionInfo.buildDate,
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
