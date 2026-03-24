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
  GoToRangeLinkCommand,
  JumpToDestinationCommand,
  ListBookmarksCommand,
  ManageBookmarksCommand,
  ShowVersionCommand,
} from './commands';
import { ConfigReader, DelimiterCache } from './config';
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
import type { VersionInfo } from './types';

export interface WiringServices {
  ideAdapter: VscodeAdapter;
  logger: Logger;
  availabilityService: DestinationAvailabilityService;
  destinationManager: PasteDestinationManager;
  statusBar: RangeLinkStatusBar;
  linkGenerator: LinkGenerator;
  textSelectionPaster: TextSelectionPaster;
  filePathPaster: FilePathPaster;
  terminalSelectionService: TerminalSelectionService;
  bindToTerminalCommand: BindToTerminalCommand;
  bindToTextEditorCommand: BindToTextEditorCommand;
  showVersionCommand: ShowVersionCommand;
  bindToDestinationCommand: BindToDestinationCommand;
  jumpToDestinationCommand: JumpToDestinationCommand;
  goToRangeLinkCommand: GoToRangeLinkCommand;
  addBookmarkCommand: AddBookmarkCommand;
  listBookmarksCommand: ListBookmarksCommand;
  manageBookmarksCommand: ManageBookmarksCommand;
  filePathTerminalProvider: FilePathTerminalProvider;
  filePathDocumentProvider: FilePathDocumentProvider;
  terminalLinkProvider: RangeLinkTerminalProvider;
  documentLinkProvider: RangeLinkDocumentProvider;
  delimiterCache: DelimiterCache;
}

export interface ExtensionDependencies {
  ideAdapter: VscodeAdapter;
  logger: Logger;
  versionInfo: VersionInfo | undefined;
}

/**
 * Build the full object graph from foundational dependencies.
 * Returns all services needed by wireSubscriptions.
 */
export const createWiringServices = (
  deps: ExtensionDependencies,
  context: vscode.ExtensionContext,
): WiringServices => {
  const { ideAdapter, logger, versionInfo } = deps;

  const configReader = ConfigReader.create(ideAdapter, logger);
  const delimiterCache = new DelimiterCache(configReader, ideAdapter, logger);
  const getDelimiters: DelimiterConfigGetter = delimiterCache.getDelimiters;

  const bookmarksStore = new BookmarksStore(context.globalState, logger);
  logger.debug({ fn: 'createWiringServices' }, 'Bookmarks store initialized');

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
  const addBookmarkCommand = new AddBookmarkCommand(getDelimiters, ideAdapter, bookmarkService, logger);
  const showVersionCommand = new ShowVersionCommand(ideAdapter, logger, versionInfo);
  const bindToDestinationCommand = new BindToDestinationCommand(destinationManager, destinationPicker, logger);
  const jumpToDestinationCommand = new JumpToDestinationCommand(destinationManager, destinationPicker, logger);
  const listBookmarksCommand = new ListBookmarksCommand(ideAdapter, bookmarkService, logger);
  const manageBookmarksCommand = new ManageBookmarksCommand(ideAdapter, bookmarkService, logger);

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
  const filePathPaster = new FilePathPaster(ideAdapter, destinationManager, configReader, clipboardRouter, logger);
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
  const statusBar = new RangeLinkStatusBar(ideAdapter, destinationManager, availabilityService, bookmarkService, logger);

  const navigationHandler = new RangeLinkNavigationHandler(getDelimiters, ideAdapter, configReader, logger);
  logger.debug({ fn: 'createWiringServices' }, 'Navigation handler created');
  const filePathNavigationHandler = new FilePathNavigationHandler(ideAdapter, logger);
  const goToRangeLinkCommand = new GoToRangeLinkCommand(ideAdapter, navigationHandler, logger);

  const filePathTerminalProvider = new FilePathTerminalProvider(getDelimiters, filePathNavigationHandler, logger);
  const filePathDocumentProvider = new FilePathDocumentProvider(getDelimiters, filePathNavigationHandler, ideAdapter, logger);
  const terminalLinkProvider = new RangeLinkTerminalProvider(navigationHandler, getDelimiters, ideAdapter, logger);
  const documentLinkProvider = new RangeLinkDocumentProvider(navigationHandler, getDelimiters, ideAdapter, logger);

  return {
    ideAdapter,
    logger,
    availabilityService,
    destinationManager,
    statusBar,
    linkGenerator,
    textSelectionPaster,
    filePathPaster,
    terminalSelectionService,
    bindToTerminalCommand,
    bindToTextEditorCommand,
    showVersionCommand,
    bindToDestinationCommand,
    jumpToDestinationCommand,
    goToRangeLinkCommand,
    addBookmarkCommand,
    listBookmarksCommand,
    manageBookmarksCommand,
    filePathTerminalProvider,
    filePathDocumentProvider,
    terminalLinkProvider,
    documentLinkProvider,
    delimiterCache,
  };
};
