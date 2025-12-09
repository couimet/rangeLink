/**
 * Test helpers and utilities
 *
 * Re-exports all test helper modules for convenient importing.
 */

// Export individual mock factories
export { createMockAsRelativePath } from './createMockAsRelativePath';
export { createMockCancellationToken } from './createMockCancellationToken';
export {
  createMockChatPasteHelper,
  createMockChatPasteHelperFactory,
  type MockChatPasteHelper,
} from './createMockChatPasteHelperFactory';
export { createMockClipboard } from './createMockClipboard';
export { createMockCommands } from './createMockCommands';
export {
  createMockDestinationFactory,
  type MockDestinationFactoryOptions,
} from './createMockDestinationFactory';
export { createMockDestinationRegistry } from './createMockDestinationRegistry';
export { createMockDocument } from './createMockDocument';
export { createMockDocumentLink } from './createMockDocumentLink';
export { createMockEditor } from './createMockEditor';
export { createMockEligibilityCheckerFactory } from './createMockEligibilityCheckerFactory';
export { createMockEnv } from './createMockEnv';
export { createMockExtensions } from './createMockExtensions';
export { createMockFocusManagerFactory } from './createMockFocusManagerFactory';
export { createMockGetWorkspaceFolder } from './createMockGetWorkspaceFolder';
export { createMockInputSelection } from './createMockInputSelection';
export { createMockNavigationHandler } from './createMockNavigationHandler';
export { createMockOutputChannel } from './createMockOutputChannel';
export { createMockPosition } from './createMockPosition';
export { createMockPositionAt } from './createMockPositionAt';
export { createMockRange } from './createMockRange';
export { createMockSelection } from './createMockSelection';
export { createMockStatusBarItem } from './createMockStatusBarItem';
export { createMockTab } from './createMockTab';
export { createMockTabGroup } from './createMockTabGroup';
export { createMockTabGroups } from './createMockTabGroups';
export { createMockTerminal } from './createMockTerminal';
export { createMockText } from './createMockText';
export { createMockTextInserterFactory } from './createMockTextInserterFactory';
export { createMockUri } from './createMockUri';
export { createMockWindow } from './createMockWindow';
export { createMockWorkspace } from './createMockWorkspace';
export { createMockWorkspaceFolder } from './createMockWorkspaceFolder';

// Export MockTabInputText class
export { MockTabInputText } from './tabTestHelpers';

// Export helper functions
export { configureWorkspaceMocks } from './configureWorkspaceMocks';
export { configureEmptyTabGroups } from './configureEmptyTabGroups';
export { simulateClosedEditor } from './simulateClosedEditor';
export { simulateFileOutsideWorkspace } from './simulateFileOutsideWorkspace';

// Export complex utilities and types from mockVSCode
export * from './mockVSCode';
