import type { Logger } from 'barebone-logger';
import type { DelimiterConfigGetter } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import { BookmarkService, BookmarksStore } from './bookmarks';
import { DefaultClipboardPreserver } from './clipboard';
import {
  AddBookmarkCommand,
  BindToDestinationCommand,
  BindToTextEditorCommand,
  BindToTerminalCommand,
  createBindAIAssistantCommand,
  GoToRangeLinkCommand,
  JumpToDestinationCommand,
  ListBookmarksCommand,
  ManageBookmarksCommand,
  ShowVersionCommand,
} from './commands';
import { ConfigReader, DelimiterCache } from './config';
import {
  CMD_BIND_TO_CLAUDE_CODE,
  CMD_BIND_TO_CURSOR_AI,
  CMD_BIND_TO_DESTINATION,
  CMD_BIND_TO_GITHUB_COPILOT_CHAT,
  CMD_BIND_TO_TERMINAL,
  CMD_BIND_TO_TERMINAL_HERE,
  CMD_BIND_TO_TEXT_EDITOR,
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_BOOKMARK_ADD,
  CMD_BOOKMARK_LIST,
  CMD_BOOKMARK_MANAGE,
  CMD_CONTEXT_EDITOR_CONTENT_BIND,
  CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH,
  CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH,
  CMD_CONTEXT_EDITOR_CONTENT_UNBIND,
  CMD_CONTEXT_EDITOR_COPY_LINK,
  CMD_CONTEXT_EDITOR_COPY_LINK_ABSOLUTE,
  CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK,
  CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK_ABSOLUTE,
  CMD_CONTEXT_EDITOR_PASTE_SELECTED_TEXT,
  CMD_CONTEXT_EDITOR_SAVE_BOOKMARK,
  CMD_CONTEXT_EDITOR_TAB_PASTE_FILE_PATH,
  CMD_CONTEXT_EDITOR_TAB_PASTE_RELATIVE_FILE_PATH,
  CMD_CONTEXT_EXPLORER_BIND,
  CMD_CONTEXT_EXPLORER_PASTE_FILE_PATH,
  CMD_CONTEXT_EXPLORER_PASTE_RELATIVE_FILE_PATH,
  CMD_CONTEXT_EXPLORER_UNBIND,
  CMD_CONTEXT_TERMINAL_BIND,
  CMD_CONTEXT_TERMINAL_UNBIND,
  CMD_COPY_LINK_ABSOLUTE,
  CMD_COPY_LINK_ONLY_ABSOLUTE,
  CMD_COPY_LINK_ONLY_RELATIVE,
  CMD_COPY_LINK_RELATIVE,
  CMD_COPY_PORTABLE_LINK_ABSOLUTE,
  CMD_COPY_PORTABLE_LINK_RELATIVE,
  CMD_GO_TO_RANGELINK,
  CMD_HANDLE_DOCUMENT_LINK_CLICK,
  CMD_HANDLE_FILE_PATH_CLICK,
  CMD_JUMP_TO_DESTINATION,
  CMD_OPEN_STATUS_BAR_MENU,
  CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
  CMD_PASTE_FILE_PATH_ABSOLUTE,
  CMD_PASTE_FILE_PATH_RELATIVE,
  CMD_PASTE_TO_DESTINATION,
  CMD_SHOW_VERSION,
  CMD_TERMINAL_COPY_LINK_GUARD,
  CMD_TERMINAL_LINK_BRIDGE,
  CMD_TERMINAL_PASTE_SELECTED_TEXT,
  CMD_UNBIND_DESTINATION,
} from './constants';
import { EligibilityCheckerFactory } from './destinations/capabilities/EligibilityCheckerFactory';
import { FocusCapabilityFactory } from './destinations/capabilities/FocusCapabilityFactory';
import { DestinationAvailabilityService } from './destinations/DestinationAvailabilityService';
import { registerAllDestinationBuilders } from './destinations/destinationBuilders';
import { DestinationPicker } from './destinations/DestinationPicker';
import { DestinationRegistry } from './destinations/DestinationRegistry';
import { PasteDestinationManager } from './destinations/PasteDestinationManager';
import type { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { FilePathDocumentProvider } from './navigation/FilePathDocumentProvider';
import { FilePathNavigationHandler } from './navigation/FilePathNavigationHandler';
import { FilePathTerminalProvider } from './navigation/FilePathTerminalProvider';
import { RangeLinkDocumentProvider } from './navigation/RangeLinkDocumentProvider';
import { RangeLinkNavigationHandler } from './navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from './navigation/RangeLinkTerminalProvider';
import {
  ClipboardRouter,
  FilePathPaster,
  LinkGenerator,
  SelectionValidator,
  TerminalSelectionService,
  TextSelectionPaster,
} from './services';
import { RangeLinkStatusBar } from './statusBar';
import { type FilePathClickArgs, PathFormat, type RangeLinkClickArgs, type VersionInfo } from './types';
import { registerWithLogging } from './utils';

export interface ExtensionDependencies {
  ideAdapter: VscodeAdapter;
  logger: Logger;
  versionInfo: VersionInfo | undefined;
}

/**
 * Build the full object graph and wire all commands and providers into `context.subscriptions`.
 */
export const wireSubscriptions = (
  context: vscode.ExtensionContext,
  deps: ExtensionDependencies,
): void => {
  const { ideAdapter, logger, versionInfo } = deps;

  // Config and delimiters
  const configReader = ConfigReader.create(ideAdapter, logger);
  const delimiterCache = new DelimiterCache(configReader, ideAdapter, logger);
  context.subscriptions.push(delimiterCache);
  const getDelimiters: DelimiterConfigGetter = delimiterCache.getDelimiters;

  // Bookmarks store
  const bookmarksStore = new BookmarksStore(context.globalState, logger);
  logger.debug({ fn: 'wireSubscriptions' }, 'Bookmarks store initialized');

  // Capability factories and destination registry
  const clipboardPreserver = new DefaultClipboardPreserver(ideAdapter, configReader, logger);
  const focusCapabilityFactory = new FocusCapabilityFactory(ideAdapter, clipboardPreserver, logger);
  const eligibilityCheckerFactory = new EligibilityCheckerFactory(logger);
  const registry = new DestinationRegistry(
    focusCapabilityFactory,
    eligibilityCheckerFactory,
    ideAdapter,
    logger,
  );
  registerAllDestinationBuilders(registry);

  const availabilityService = new DestinationAvailabilityService(
    registry,
    ideAdapter,
    configReader,
    logger,
  );
  const destinationPicker = new DestinationPicker(ideAdapter, availabilityService, logger);
  const destinationManager = new PasteDestinationManager(context, registry, ideAdapter, logger);

  // Commands
  const bindToTerminalCommand = new BindToTerminalCommand(
    ideAdapter,
    availabilityService,
    destinationManager,
    logger,
  );
  const bindToTextEditorCommand = new BindToTextEditorCommand(
    ideAdapter,
    availabilityService,
    destinationManager,
    logger,
  );
  const bookmarkService = new BookmarkService(
    bookmarksStore,
    ideAdapter,
    configReader,
    destinationManager,
    logger,
  );
  const addBookmarkCommand = new AddBookmarkCommand(
    getDelimiters,
    ideAdapter,
    bookmarkService,
    logger,
  );
  const showVersionCommand = new ShowVersionCommand(ideAdapter, logger, versionInfo);
  const bindToDestinationCommand = new BindToDestinationCommand(
    destinationManager,
    destinationPicker,
    logger,
  );
  const jumpToDestinationCommand = new JumpToDestinationCommand(
    destinationManager,
    destinationPicker,
    logger,
  );
  const listBookmarksCommand = new ListBookmarksCommand(ideAdapter, bookmarkService, logger);
  const manageBookmarksCommand = new ManageBookmarksCommand(ideAdapter, bookmarkService, logger);

  // Services
  const selectionValidator = new SelectionValidator(ideAdapter, logger);
  const clipboardRouter = new ClipboardRouter(
    ideAdapter,
    destinationManager,
    destinationPicker,
    clipboardPreserver,
    logger,
  );
  const terminalSelectionService = new TerminalSelectionService(
    ideAdapter,
    destinationManager,
    configReader,
    clipboardPreserver,
    clipboardRouter,
    logger,
  );
  const filePathPaster = new FilePathPaster(
    ideAdapter,
    destinationManager,
    configReader,
    clipboardRouter,
    logger,
  );
  const linkGenerator = new LinkGenerator(
    getDelimiters,
    ideAdapter,
    destinationManager,
    configReader,
    clipboardRouter,
    selectionValidator,
    logger,
  );
  const textSelectionPaster = new TextSelectionPaster(
    destinationManager,
    configReader,
    clipboardRouter,
    selectionValidator,
    logger,
  );
  const statusBar = new RangeLinkStatusBar(
    ideAdapter,
    destinationManager,
    availabilityService,
    bookmarkService,
    logger,
  );

  // Navigation handlers and link providers
  const navigationHandler = new RangeLinkNavigationHandler(
    getDelimiters,
    ideAdapter,
    configReader,
    logger,
  );
  logger.debug({ fn: 'wireSubscriptions' }, 'Navigation handler created');
  const filePathNavigationHandler = new FilePathNavigationHandler(ideAdapter, logger);
  const goToRangeLinkCommand = new GoToRangeLinkCommand(ideAdapter, navigationHandler, logger);

  const filePathTerminalProvider = new FilePathTerminalProvider(
    getDelimiters,
    filePathNavigationHandler,
    logger,
  );
  const filePathDocumentProvider = new FilePathDocumentProvider(
    getDelimiters,
    filePathNavigationHandler,
    ideAdapter,
    logger,
  );
  const terminalLinkProvider = new RangeLinkTerminalProvider(
    navigationHandler,
    getDelimiters,
    ideAdapter,
    logger,
  );
  const documentLinkProvider = new RangeLinkDocumentProvider(
    navigationHandler,
    getDelimiters,
    ideAdapter,
    logger,
  );

  // Handler closures
  const bindToTerminalHandler = async () => {
    await bindToTerminalCommand.execute();
  };
  const bindToTextEditorHandler = async (uri?: unknown) => {
    await bindToTextEditorCommand.execute(uri as vscode.Uri | undefined);
  };

  // ============================================================================
  // Subscriptions
  // ============================================================================

  // Disposables
  context.subscriptions.push(statusBar);
  context.subscriptions.push(destinationManager);

  // Link providers
  context.subscriptions.push(
    registerWithLogging(
      ideAdapter.registerTerminalLinkProvider(filePathTerminalProvider),
      'File path terminal link provider registered',
    ),
  );
  context.subscriptions.push(
    registerWithLogging(
      ideAdapter.registerDocumentLinkProvider(
        [{ scheme: 'file' }, { scheme: 'untitled' }],
        filePathDocumentProvider,
      ),
      'File path document link provider registered',
    ),
  );
  context.subscriptions.push(
    registerWithLogging(
      ideAdapter.registerTerminalLinkProvider(terminalLinkProvider),
      'Terminal link provider registered',
    ),
  );
  context.subscriptions.push(
    registerWithLogging(
      ideAdapter.registerDocumentLinkProvider(
        [{ scheme: 'file' }, { scheme: 'untitled' }],
        documentLinkProvider,
      ),
      'Document link provider registered',
    ),
  );

  // Commands
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_OPEN_STATUS_BAR_MENU, () => statusBar.openMenu()),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_COPY_LINK_RELATIVE, () =>
      linkGenerator.createLink(PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_COPY_LINK_ABSOLUTE, () =>
      linkGenerator.createLink(PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_COPY_PORTABLE_LINK_RELATIVE, () =>
      linkGenerator.createPortableLink(PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_COPY_PORTABLE_LINK_ABSOLUTE, () =>
      linkGenerator.createPortableLink(PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_COPY_LINK_ONLY_RELATIVE, () =>
      linkGenerator.createLinkOnly(PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_COPY_LINK_ONLY_ABSOLUTE, () =>
      linkGenerator.createLinkOnly(PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_PASTE_TO_DESTINATION, () =>
      textSelectionPaster.pasteSelectedTextToDestination(),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_SHOW_VERSION, () => showVersionCommand.execute()),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BIND_TO_TERMINAL, bindToTerminalHandler),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BIND_TO_TERMINAL_HERE, bindToTerminalHandler),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BIND_TO_TEXT_EDITOR, bindToTextEditorHandler),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BIND_TO_TEXT_EDITOR_HERE, bindToTextEditorHandler),
  );

  for (const [cmd, kind] of [
    [CMD_BIND_TO_CURSOR_AI, 'cursor-ai'],
    [CMD_BIND_TO_CLAUDE_CODE, 'claude-code'],
    [CMD_BIND_TO_GITHUB_COPILOT_CHAT, 'github-copilot-chat'],
  ] as const) {
    context.subscriptions.push(
      ideAdapter.registerCommand(
        cmd,
        createBindAIAssistantCommand(
          kind,
          availabilityService,
          destinationManager,
          ideAdapter,
          logger,
        ),
      ),
    );
  }

  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_UNBIND_DESTINATION, () => {
      destinationManager.unbind();
    }),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BIND_TO_DESTINATION, async () => {
      await bindToDestinationCommand.execute();
    }),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_JUMP_TO_DESTINATION, async () => {
      await jumpToDestinationCommand.execute();
    }),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, (args) => {
      return documentLinkProvider.handleLinkClick(args as RangeLinkClickArgs);
    }),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_HANDLE_FILE_PATH_CLICK, (args) => {
      return filePathDocumentProvider.handleLinkClick(args as FilePathClickArgs);
    }),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_GO_TO_RANGELINK, () => goToRangeLinkCommand.execute()),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BOOKMARK_ADD, () => addBookmarkCommand.execute()),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BOOKMARK_LIST, () => listBookmarksCommand.execute()),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_BOOKMARK_MANAGE, () => manageBookmarksCommand.execute()),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_PASTE_FILE_PATH_ABSOLUTE, (uri) =>
      filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_PASTE_FILE_PATH_RELATIVE, (uri) =>
      filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE, () =>
      filePathPaster.pasteCurrentFilePathToDestination(PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE, () =>
      filePathPaster.pasteCurrentFilePathToDestination(PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EXPLORER_PASTE_FILE_PATH, (uri) =>
      filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EXPLORER_PASTE_RELATIVE_FILE_PATH, (uri) =>
      filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EXPLORER_BIND, bindToTextEditorHandler),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EXPLORER_UNBIND, () => {
      destinationManager.unbind();
    }),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_TAB_PASTE_FILE_PATH, (uri) =>
      filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_TAB_PASTE_RELATIVE_FILE_PATH, (uri) =>
      filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH, (uri) =>
      uri
        ? filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.Absolute)
        : filePathPaster.pasteCurrentFilePathToDestination(PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH, (uri) =>
      uri
        ? filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.WorkspaceRelative)
        : filePathPaster.pasteCurrentFilePathToDestination(PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_CONTENT_BIND, bindToTextEditorHandler),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_CONTENT_UNBIND, () => {
      destinationManager.unbind();
    }),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_TERMINAL_BIND, bindToTerminalHandler),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_TERMINAL_UNBIND, () => {
      destinationManager.unbind();
    }),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_TERMINAL_PASTE_SELECTED_TEXT, () =>
      terminalSelectionService.pasteTerminalSelectionToDestination(),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_TERMINAL_LINK_BRIDGE, () =>
      terminalSelectionService.terminalLinkBridge(),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_TERMINAL_COPY_LINK_GUARD, () =>
      terminalSelectionService.terminalCopyLinkGuard(),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_COPY_LINK, () =>
      linkGenerator.createLink(PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_COPY_LINK_ABSOLUTE, () =>
      linkGenerator.createLink(PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK, () =>
      linkGenerator.createPortableLink(PathFormat.WorkspaceRelative),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK_ABSOLUTE, () =>
      linkGenerator.createPortableLink(PathFormat.Absolute),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_PASTE_SELECTED_TEXT, () =>
      textSelectionPaster.pasteSelectedTextToDestination(),
    ),
  );
  context.subscriptions.push(
    ideAdapter.registerCommand(CMD_CONTEXT_EDITOR_SAVE_BOOKMARK, () =>
      addBookmarkCommand.execute(),
    ),
  );
};
