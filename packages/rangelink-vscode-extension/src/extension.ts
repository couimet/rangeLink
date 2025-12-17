import { getLogger, setLogger } from 'barebone-logger';
import * as vscode from 'vscode';

import { getDelimitersForExtension } from './config';
import { CMD_OPEN_STATUS_BAR_MENU } from './constants';
import { EligibilityCheckerFactory } from './destinations/capabilities/EligibilityCheckerFactory';
import { FocusManagerFactory } from './destinations/capabilities/FocusManagerFactory';
import { TextInserterFactory } from './destinations/capabilities/TextInserterFactory';
import { registerAllDestinationBuilders } from './destinations/destinationBuilders';
import { DestinationRegistry } from './destinations/DestinationRegistry';
import { PasteDestinationManager } from './destinations/PasteDestinationManager';
import { setLocale } from './i18n/LocaleManager';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { RangeLinkDocumentProvider } from './navigation/RangeLinkDocumentProvider';
import { RangeLinkNavigationHandler } from './navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from './navigation/RangeLinkTerminalProvider';
import { PathFormat, RangeLinkService } from './RangeLinkService';
import { RangeLinkStatusBar } from './statusBar';
import type { RangeLinkClickArgs } from './types';
import { MessageCode } from './types/MessageCode';
import { formatMessage } from './utils/formatMessage';
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
  // Create adapter FIRST (only direct vscode reference in entire file)
  const ideAdapter = new VscodeAdapter(vscode);

  outputChannel = ideAdapter.createOutputChannel('RangeLink');

  // Initialize core library logger with VSCode adapter
  const vscodeLogger = new VSCodeLogger(outputChannel);
  setLogger(vscodeLogger);

  // Initialize i18n locale from VSCode environment
  setLocale(ideAdapter.language);

  // Load delimiter configuration
  const vscodeConfig = ideAdapter.getConfiguration('rangelink');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delimiters = getDelimitersForExtension(vscodeConfig as any, ideAdapter, getLogger());

  // Create capability factories for composition-based destinations
  const textInserterFactory = new TextInserterFactory(ideAdapter, getLogger());
  const eligibilityCheckerFactory = new EligibilityCheckerFactory(getLogger());
  const focusManagerFactory = new FocusManagerFactory(ideAdapter, getLogger());

  // Create destination registry with capability factories
  const registry = new DestinationRegistry(
    textInserterFactory,
    eligibilityCheckerFactory,
    focusManagerFactory,
    ideAdapter,
    getLogger(),
  );

  // Register all destination builders with the registry
  registerAllDestinationBuilders(registry);

  // Create unified destination manager
  const destinationManager = new PasteDestinationManager(
    context,
    registry,
    ideAdapter,
    getLogger(),
  );

  const service = new RangeLinkService(delimiters, ideAdapter, destinationManager, getLogger());

  const statusBar = new RangeLinkStatusBar(ideAdapter, destinationManager, getLogger());
  context.subscriptions.push(statusBar);
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_OPEN_STATUS_BAR_MENU, () => statusBar.openMenu()),
  );

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
      ideAdapter.registerTerminalLinkProvider(terminalLinkProvider),
      'Terminal link provider registered',
    ),
  );

  // Register document link provider for clickable links in editor files
  // Only register for specific schemes to prevent infinite recursion when scanning output channels
  const documentLinkProvider = new RangeLinkDocumentProvider(
    navigationHandler,
    ideAdapter,
    getLogger(),
  );
  context.subscriptions.push(
    registerWithLogging(
      ideAdapter.registerDocumentLinkProvider(
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
    ideAdapter.registerCommand('rangelink.copyLinkWithRelativePath', () =>
      service.createLink(PathFormat.WorkspaceRelative),
    ),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.copyLinkWithAbsolutePath', () =>
      service.createLink(PathFormat.Absolute),
    ),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.copyPortableLinkWithRelativePath', () =>
      service.createPortableLink(PathFormat.WorkspaceRelative),
    ),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.copyPortableLinkWithAbsolutePath', () =>
      service.createPortableLink(PathFormat.Absolute),
    ),
  );

  // Register clipboard-only commands (issue #117)
  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.copyLinkOnlyWithRelativePath', () =>
      service.createLinkOnly(PathFormat.WorkspaceRelative),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rangelink.copyLinkOnlyWithAbsolutePath', () =>
      service.createLinkOnly(PathFormat.Absolute),
    ),
  );

  // Register paste selected text command (issue #89)
  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.pasteSelectedTextToDestination', () =>
      service.pasteSelectedTextToDestination(),
    ),
  );

  // Register version info command
  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.showVersion', async () => {
      try {
        const versionInfo = require('./version.json');
        const isDirtyIndicator = versionInfo.isDirty ? ' (with uncommitted changes)' : '';
        const message = `RangeLink v${versionInfo.version}\nCommit: ${versionInfo.commit}${isDirtyIndicator}\nBranch: ${versionInfo.branch}\nBuild: ${versionInfo.buildDate}`;
        const selection = await ideAdapter.showInformationMessage(message, 'Copy Commit Hash');
        if (selection === 'Copy Commit Hash') {
          await ideAdapter.writeTextToClipboard(versionInfo.commitFull);
          await ideAdapter.showInformationMessage(
            formatMessage(MessageCode.INFO_COMMIT_HASH_COPIED),
          );
        }
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
        await ideAdapter.showErrorMessage('Version information not available');
      }
    }),
  );

  // Register destination binding commands
  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.bindToTerminal', async () => {
      await destinationManager.bind('terminal');
    }),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.bindToTextEditor', async () => {
      await destinationManager.bind('text-editor');
    }),
  );

  // Register AI assistant destination binding commands
  // Both commands are always registered to make them discoverable in Command Palette
  // Runtime availability checks show helpful messages when IDE/extension not available
  // This prevents "command not found" errors while maintaining discoverability
  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.bindToCursorAI', async () => {
      const cursorDestination = registry.create({ type: 'cursor-ai' });
      if (!(await cursorDestination.isAvailable())) {
        void ideAdapter.showInformationMessage(
          "This command is designed for Cursor IDE, which has built-in AI chat.\n\nRangeLink can paste code ranges directly into Cursor's AI chat for faster context sharing. To use this feature, open your project in Cursor IDE instead of VS Code.",
        );
        return;
      }
      await destinationManager.bind('cursor-ai');
    }),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.bindToClaudeCode', async () => {
      const claudeCodeDestination = registry.create({ type: 'claude-code' });
      if (!(await claudeCodeDestination.isAvailable())) {
        void ideAdapter.showInformationMessage(
          'RangeLink can seamlessly integrate with Claude Code for faster context sharing of precise code ranges.\n\nInstall and activate the Claude Code extension to use it as a paste destination.',
        );
        return;
      }
      await destinationManager.bind('claude-code');
    }),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.bindToGitHubCopilotChat', async () => {
      const gitHubCopilotChatDestination = registry.create({ type: 'github-copilot-chat' });
      if (!(await gitHubCopilotChatDestination.isAvailable())) {
        void ideAdapter.showInformationMessage(
          'RangeLink can seamlessly integrate with GitHub Copilot Chat for faster context sharing of precise code ranges.\n\nInstall and activate the GitHub Copilot Chat extension to use it as a paste destination.',
        );
        return;
      }
      await destinationManager.bind('github-copilot-chat');
    }),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.unbindDestination', () => {
      destinationManager.unbind();
    }),
  );

  // Register jump to bound destination command
  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.jumpToBoundDestination', async () => {
      await destinationManager.jumpToBoundDestination();
    }),
  );

  // Register document link navigation command
  context.subscriptions.push(
    ideAdapter.registerCommand('rangelink.handleDocumentLinkClick', (args) => {
      return documentLinkProvider.handleLinkClick(args as RangeLinkClickArgs);
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
