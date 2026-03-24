import { createMockLogger } from 'barebone-logger-testing';

import type { WiringServices } from '../../createWiringServices';

import { createMockVscodeAdapter } from './createMockVscodeAdapter';

/**
 * Create a mock WiringServices with jest.fn() stubs for all service methods.
 *
 * Each service exposes only the methods that wireSubscriptions closures call,
 * keeping the mock minimal and focused on delegation verification.
 */
export const createMockWiringServices = (): jest.Mocked<WiringServices> =>
  ({
    ideAdapter: createMockVscodeAdapter(),
    logger: createMockLogger(),
    availabilityService: {
      getTerminalItems: jest.fn(),
      getAllFileItems: jest.fn(),
      getGroupedDestinationItems: jest.fn(),
    },
    destinationManager: {
      bind: jest.fn(),
      unbind: jest.fn(),
      getBoundDestination: jest.fn(),
      dispose: jest.fn(),
    },
    statusBar: { openMenu: jest.fn(), dispose: jest.fn() },
    linkGenerator: {
      createLink: jest.fn(),
      createPortableLink: jest.fn(),
      createLinkOnly: jest.fn(),
    },
    textSelectionPaster: { pasteSelectedTextToDestination: jest.fn() },
    filePathPaster: {
      pasteFilePathToDestination: jest.fn(),
      pasteCurrentFilePathToDestination: jest.fn(),
    },
    terminalSelectionService: {
      pasteTerminalSelectionToDestination: jest.fn(),
      terminalLinkBridge: jest.fn(),
      terminalCopyLinkGuard: jest.fn(),
    },
    bindToTerminalCommand: { execute: jest.fn() },
    bindToTextEditorCommand: { execute: jest.fn() },
    showVersionCommand: { execute: jest.fn() },
    bindToDestinationCommand: { execute: jest.fn() },
    jumpToDestinationCommand: { execute: jest.fn() },
    goToRangeLinkCommand: { execute: jest.fn() },
    addBookmarkCommand: { execute: jest.fn() },
    listBookmarksCommand: { execute: jest.fn() },
    manageBookmarksCommand: { execute: jest.fn() },
    filePathTerminalProvider: {},
    filePathDocumentProvider: { handleLinkClick: jest.fn() },
    terminalLinkProvider: {},
    documentLinkProvider: { handleLinkClick: jest.fn() },
    delimiterCache: { dispose: jest.fn() },
  }) as unknown as jest.Mocked<WiringServices>;
