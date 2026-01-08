import { getLogger, setLogger } from 'barebone-logger';
import * as vscode from 'vscode';

import { BookmarkService, BookmarksStore } from './bookmarks';
import { AddBookmarkCommand } from './commands/AddBookmarkCommand';
import { ListBookmarksCommand } from './commands/ListBookmarksCommand';
import { ConfigReader, getDelimitersForExtension } from './config';
import {
  CMD_BIND_TO_CLAUDE_CODE,
  CMD_BIND_TO_CURSOR_AI,
  CMD_BIND_TO_GITHUB_COPILOT_CHAT,
  CMD_BIND_TO_TERMINAL,
  CMD_BIND_TO_TEXT_EDITOR,
  CMD_BOOKMARK_ADD,
  CMD_BOOKMARK_LIST,
  CMD_BOOKMARK_MANAGE,
  CMD_COPY_LINK_ABSOLUTE,
  CMD_COPY_LINK_ONLY_ABSOLUTE,
  CMD_COPY_LINK_ONLY_RELATIVE,
  CMD_COPY_LINK_RELATIVE,
  CMD_COPY_PORTABLE_LINK_ABSOLUTE,
  CMD_COPY_PORTABLE_LINK_RELATIVE,
  CMD_HANDLE_DOCUMENT_LINK_CLICK,
  CMD_JUMP_TO_DESTINATION,
  CMD_OPEN_STATUS_BAR_MENU,
  CMD_PASTE_TO_DESTINATION,
  CMD_SHOW_VERSION,
  CMD_UNBIND_DESTINATION,
} from './constants';
import { EligibilityCheckerFactory } from './destinations/capabilities/EligibilityCheckerFactory';
import { PasteExecutorFactory } from './destinations/capabilities/PasteExecutorFactory';
import { DestinationAvailabilityService } from './destinations/DestinationAvailabilityService';
import { registerAllDestinationBuilders } from './destinations/destinationBuilders';
import { DestinationRegistry } from './destinations/DestinationRegistry';
import { PasteDestinationManager } from './destinations/PasteDestinationManager';
import { setLocale } from './i18n/LocaleManager';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { RangeLinkDocumentProvider } from './navigation/RangeLinkDocumentProvider';
import { RangeLinkNavigationHandler } from './navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from './navigation/RangeLinkTerminalProvider';
import { RangeLinkParser } from './RangeLinkParser';
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
  const configReader = ConfigReader.create(ideAdapter, getLogger());

  outputChannel = ideAdapter.createOutputChannel('RangeLink');

  // Initialize core library logger with VSCode adapter
  const vscodeLogger = new VSCodeLogger(outputChannel);
  setLogger(vscodeLogger);

  // Initialize i18n locale from VSCode environment
  setLocale(ideAdapter.language);

  // Create bookmarks store for cross-workspace bookmark persistence
  const bookmarksStore = new BookmarksStore(context.globalState, getLogger());
  getLogger().debug({ fn: 'activate' }, 'Bookmarks store initialized');

  const delimiters = getDelimitersForExtension(configReader, ideAdapter, getLogger());

  // Create capability factories for composition-based destinations
  const pasteExecutorFactory = new PasteExecutorFactory(ideAdapter, getLogger());
  const eligibilityCheckerFactory = new EligibilityCheckerFactory(getLogger());

  // Create destination registry with capability factories
  const registry = new DestinationRegistry(
    pasteExecutorFactory,
    eligibilityCheckerFactory,
    ideAdapter,
    getLogger(),
  );

  // Register all destination builders with the registry
  registerAllDestinationBuilders(registry);

  const availabilityService = new DestinationAvailabilityService(registry, ideAdapter, getLogger());

  // Create unified destination manager
  const destinationManager = new PasteDestinationManager(
    context,
    registry,
    availabilityService,
    ideAdapter,
    getLogger(),
  );

  const bookmarkService = new BookmarkService(
    bookmarksStore,
    ideAdapter,
    configReader,
    destinationManager,
    getLogger(),
  );

  const service = new RangeLinkService(
    delimiters,
    ideAdapter,
    destinationManager,
    configReader,
    getLogger(),
  );

  const statusBar = new RangeLinkStatusBar(
    ideAdapter,
    destinationManager,
    availabilityService,
    bookmarkService,
    getLogger(),
  );
  context.subscriptions.push(statusBar);
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_OPEN_STATUS_BAR_MENU, () => statusBar.openMenu()),
  );

  // Register destinationManager for automatic disposal on deactivation
  context.subscriptions.push(destinationManager);

  // Create parser and navigation handler (used by both terminal and document providers)
  const parser = new RangeLinkParser(delimiters, getLogger());
  const navigationHandler = new RangeLinkNavigationHandler(parser, ideAdapter, getLogger());
  getLogger().debug({ fn: 'activate' }, 'Parser and navigation handler created');

  const addBookmarkCommand = new AddBookmarkCommand(
    parser,
    delimiters,
    ideAdapter,
    bookmarkService,
    getLogger(),
  );

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
    ideAdapter.registerCommand(CMD_COPY_LINK_RELATIVE, () =>
      service.createLink(PathFormat.WorkspaceRelative),
    ),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_COPY_LINK_ABSOLUTE, () =>
      service.createLink(PathFormat.Absolute),
    ),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_COPY_PORTABLE_LINK_RELATIVE, () =>
      service.createPortableLink(PathFormat.WorkspaceRelative),
    ),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_COPY_PORTABLE_LINK_ABSOLUTE, () =>
      service.createPortableLink(PathFormat.Absolute),
    ),
  );

  // Register clipboard-only commands (issue #117)
  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_COPY_LINK_ONLY_RELATIVE, () =>
      service.createLinkOnly(PathFormat.WorkspaceRelative),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_COPY_LINK_ONLY_ABSOLUTE, () =>
      service.createLinkOnly(PathFormat.Absolute),
    ),
  );

  // Register paste selected text command (issue #89)
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_PASTE_TO_DESTINATION, () =>
      service.pasteSelectedTextToDestination(),
    ),
  );

  // Register version info command
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_SHOW_VERSION, async () => {
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
    ideAdapter.registerCommand(CMD_BIND_TO_TERMINAL, async () => {
      await destinationManager.bind('terminal');
    }),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BIND_TO_TEXT_EDITOR, async () => {
      await destinationManager.bind('text-editor');
    }),
  );

  // Register AI assistant destination binding commands
  // Both commands are always registered to make them discoverable in Command Palette
  // Runtime availability checks show helpful messages when IDE/extension not available
  // This prevents "command not found" errors while maintaining discoverability
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BIND_TO_CURSOR_AI, async () => {
      if (!(await availabilityService.isAIAssistantAvailable('cursor-ai'))) {
        void ideAdapter.showInformationMessage(
          formatMessage(availabilityService.getUnavailableMessageCode('cursor-ai')),
        );
        return;
      }
      await destinationManager.bind('cursor-ai');
    }),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BIND_TO_CLAUDE_CODE, async () => {
      if (!(await availabilityService.isAIAssistantAvailable('claude-code'))) {
        void ideAdapter.showInformationMessage(
          formatMessage(availabilityService.getUnavailableMessageCode('claude-code')),
        );
        return;
      }
      await destinationManager.bind('claude-code');
    }),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT, async () => {
      if (!(await availabilityService.isAIAssistantAvailable('github-copilot-chat'))) {
        void ideAdapter.showInformationMessage(
          formatMessage(availabilityService.getUnavailableMessageCode('github-copilot-chat')),
        );
        return;
      }
      await destinationManager.bind('github-copilot-chat');
    }),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_UNBIND_DESTINATION, () => {
      destinationManager.unbind();
    }),
  );

  // Register jump to bound destination command
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_JUMP_TO_DESTINATION, async () => {
      await destinationManager.jumpToBoundDestination();
    }),
  );

  // Register document link navigation command
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, (args) => {
      return documentLinkProvider.handleLinkClick(args as RangeLinkClickArgs);
    }),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BOOKMARK_ADD, () => addBookmarkCommand.execute()),
  );

  const listBookmarksCommand = new ListBookmarksCommand(ideAdapter, bookmarkService, getLogger());

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BOOKMARK_LIST, () => listBookmarksCommand.execute()),
  );

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BOOKMARK_MANAGE, () => {
      getLogger().info({ fn: 'CMD_BOOKMARK_MANAGE' }, 'Manage bookmarks command invoked (stub)');
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
